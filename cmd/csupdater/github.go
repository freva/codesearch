package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/hakonhall/codesearch/internal/config"
)

// --- Structs for parsing GraphQL JSON responses ---
type graphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}
type graphQLResponse struct {
	Data   json.RawMessage `json:"data,omitempty"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors,omitempty"`
}

type responseBatch = map[string]repositoryNode
type responseOwner struct {
	RepositoryOwner struct {
		Repositories repositoriesConnection `json:"repositories"`
	} `json:"repositoryOwner"`
}
type repositoriesConnection struct {
	Nodes    []repositoryNode `json:"nodes"`
	PageInfo struct {
		HasNextPage bool   `json:"hasNextPage"`
		EndCursor   string `json:"endCursor"`
	} `json:"pageInfo"`
}

// repositoryNode is a shared struct for a repo from either type of query.
type repositoryNode struct {
	Name             string `json:"name"`
	DefaultBranchRef *struct {
		Name   string `json:"name"`
		Target struct {
			OID string `json:"oid"`
		} `json:"target"`
	} `json:"defaultBranchRef"`
	RequestedRef *struct {
		OID string `json:"oid"`
	} `json:"requestedRef"`
}

const ownerRepositoriesQuery = `
query GetRepositories($owner: String!, $cursor: String) {
  repositoryOwner(login: $owner) {
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        name
        defaultBranchRef { name, target { oid } }
      }
      pageInfo { hasNextPage, endCursor }
    }
  }
}`

var commitShaRegex = regexp.MustCompile(`^[0-9a-f]{40}$`)

// GetAllRepositories resolves all repositories from the configuration.
func GetAllRepositories(cfg *config.Config) ([]config.Repository, error) {
	// Use a map to handle duplicates and easily update entries. Key is "server/owner/repo"
	repoMap := make(map[string]config.Repository)
	client := &http.Client{Timeout: 30 * time.Second}

	for _, server := range cfg.Servers {
		var ownersToFetch []string
		var specificsToFetch []config.Include

		for _, include := range server.Include {
			if include.Name == "" { // This is an owner-only include
				ownersToFetch = append(ownersToFetch, include.Owner)
			} else { // This is a specific repo include
				specificsToFetch = append(specificsToFetch, include)
			}
		}

		// Fetch all repos for the specified owners
		for _, owner := range ownersToFetch {
			err := fetchReposForOwner(client, server, owner, repoMap)
			if err != nil {
				return nil, fmt.Errorf("could not fetch repos for '%s': %w", owner, err)
			}
		}

		// Fetch all specific repos in a single batch request
		if len(specificsToFetch) > 0 {
			err := fetchSpecificRepos(client, server, specificsToFetch, repoMap)
			if err != nil {
				return nil, fmt.Errorf("could not fetch specific repos: %w", err)
			}
		}
	}

	keys := make([]string, 0, len(repoMap))
	for k := range repoMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	result := make([]config.Repository, 0, len(repoMap))
	for _, key := range keys {
		result = append(result, repoMap[key])
	}
	return result, nil
}

// fetchReposForOwner handles the paginated GraphQL query for a single owner.
func fetchReposForOwner(
	client *http.Client,
	server *config.Server,
	owner string,
	repoMap map[string]config.Repository,
) error {
	var cursor *string
	for {
		reqBody, _ := json.Marshal(graphQLRequest{
			Query:     ownerRepositoriesQuery,
			Variables: map[string]interface{}{"owner": owner, "cursor": cursor},
		})

		gqlResp, err := executeGraphQLQuery[responseOwner](client, server, reqBody)
		if err != nil {
			return fmt.Errorf("query failed: %w", err)
		}

		// Process the fetched nodes
		for _, node := range gqlResp.RepositoryOwner.Repositories.Nodes {
			if node.DefaultBranchRef == nil {
				continue
			}
			fullName := fmt.Sprintf("%s/%s", owner, node.Name)
			if server.Exclude.MatchString(fullName) {
				continue
			}

			repoMap[fmt.Sprintf("%s/%s", server.Name, fullName)] = config.Repository{
				Server: server.Name,
				Owner:  owner,
				Name:   node.Name,
				Branch: node.DefaultBranchRef.Name,
				Commit: node.DefaultBranchRef.Target.OID,
			}
		}

		if !gqlResp.RepositoryOwner.Repositories.PageInfo.HasNextPage {
			break
		}
		endCursor := gqlResp.RepositoryOwner.Repositories.PageInfo.EndCursor
		cursor = &endCursor
	}
	return nil
}

// fetchSpecificRepos builds and executes a single GraphQL query for multiple specific repos.
func fetchSpecificRepos(
	client *http.Client,
	server *config.Server,
	requests []config.Include,
	repoMap map[string]config.Repository,
) error {
	var b strings.Builder
	b.WriteString("query {")

	// Build the dynamic query with aliases
	for i, r := range requests {
		// Check for exclusion before adding to the query
		fullName := fmt.Sprintf("%s/%s", r.Owner, r.Name)
		if server.Exclude.MatchString(fullName) {
			continue
		}

		// If ref is a commit SHA, we can directly add it to the map
		if r.Ref != "" && commitShaRegex.MatchString(r.Ref) {
			repoMap[fmt.Sprintf("%s/%s", server.Name, fullName)] = config.Repository{
				Server: server.Name,
				Owner:  r.Owner,
				Name:   r.Name,
				Branch: r.Ref,
				Commit: r.Ref,
			}
			continue
		}

		// If no ref is specified, get the default branch and HEAD commit, otherwise filter on the requested ref (branch)
		refPart := "defaultBranchRef { name, target { oid } }"
		if r.Ref != "" {
			refPart = fmt.Sprintf(`requestedRef: object(expression: "refs/heads/%s") { oid }`, r.Ref)
		}

		b.WriteString(fmt.Sprintf(`
			repo_%d: repository(owner: %q, name: %q) {
				%s
			}
		`, i, r.Owner, r.Name, refPart))
	}
	b.WriteString("}")

	if b.String() == "query {}" { // All specifics were excluded
		return nil
	}

	reqBody, _ := json.Marshal(graphQLRequest{Query: b.String()})
	gqlResp, err := executeGraphQLQuery[responseBatch](client, server, reqBody)
	if err != nil {
		return err
	}

	for i, node := range *gqlResp {
		// The key from the response map is the alias (e.g., "repo_0")
		// We need the original request to get the user-specified ref.
		var originalIndex int
		_, err := fmt.Sscanf(i, "repo_%d", &originalIndex)
		if err != nil {
			return fmt.Errorf("failed to parse response key '%s': %w", i, err)
		}
		originalReq := requests[originalIndex]

		repo := config.Repository{Server: server.Name, Owner: originalReq.Owner, Name: originalReq.Name}

		if originalReq.Ref != "" && node.RequestedRef != nil && node.RequestedRef.OID != "" {
			repo.Branch = originalReq.Ref
			repo.Commit = node.RequestedRef.OID
		} else if node.DefaultBranchRef != nil {
			repo.Branch = node.DefaultBranchRef.Name
			repo.Commit = node.DefaultBranchRef.Target.OID
		}

		repoMap[fmt.Sprintf("%s/%s/%s", server.Name, originalReq.Owner, originalReq.Name)] = repo
	}

	return nil
}

func executeGraphQLQuery[T any](client *http.Client, server *config.Server, body []byte) (*T, error) {
	apiURL, err := url.Parse(server.API)
	if err != nil {
		return nil, fmt.Errorf("invalid API URL '%s': %w", server.API, err)
	}
	apiURL.Path = "/graphql"

	req, err := http.NewRequest("POST", apiURL.String(), bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	if server.Token != "" {
		req.Header.Set("Authorization", "bearer "+server.Token)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("graphql query failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var gqlResp graphQLResponse
	if err := json.Unmarshal(respBody, &gqlResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal graphql response: %w", err)
	}

	if len(gqlResp.Errors) > 0 {
		var errorMessages []string
		for _, e := range gqlResp.Errors {
			errorMessages = append(errorMessages, e.Message)
		}
		return nil, fmt.Errorf("api returned errors: %s", strings.Join(errorMessages, ", "))
	}

	var gqlData T
	if err := json.Unmarshal(gqlResp.Data, &gqlData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal 'data' field into gqlData struct: %w", err)
	}

	return &gqlData, nil
}
