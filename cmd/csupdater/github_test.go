package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"regexp"
	"strings"
	"testing"

	"github.com/freva/codesearch/internal/config"
)

func createMockServer(handler http.HandlerFunc) (*http.Client, *httptest.Server) {
	s := httptest.NewServer(handler)
	c := s.Client()
	return c, s
}

func TestExecuteGraphQLQuery(t *testing.T) {
	t.Run("non-200 status code", func(t *testing.T) {
		client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte("Internal Server Error"))
		})
		defer server.Close()

		serverConfig := &config.Server{Name: "test-server", ApiURL: server.URL}
		_, err := executeGraphQLQuery[*struct{}](client, serverConfig, []byte(`{}`))
		if err == nil {
			t.Fatal("Expected error for non-200 status, got nil")
		}
		if !strings.Contains(err.Error(), "graphql query failed with status 500") {
			t.Errorf("Expected 'graphql query failed' error, got %v", err)
		}
	})

	t.Run("invalid json response", func(t *testing.T) {
		client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`not a valid json`))
		})
		defer server.Close()

		serverConfig := &config.Server{Name: "test-server", ApiURL: server.URL}
		_, err := executeGraphQLQuery[*struct{}](client, serverConfig, []byte(`{}`))
		if err == nil {
			t.Fatal("Expected error for invalid JSON response, got nil")
		}
		if !strings.Contains(err.Error(), "failed to unmarshal graphql response") {
			t.Errorf("Expected 'failed to unmarshal graphql response' error, got %v", err)
		}
	})

	t.Run("graphql errors", func(t *testing.T) {
		client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":null,"errors":[{"message":"Error 1"},{"message":"Error 2"}]}`))
		})
		defer server.Close()

		serverConfig := &config.Server{Name: "test-server", ApiURL: server.URL}
		_, err := executeGraphQLQuery[struct{}](client, serverConfig, []byte(`{}`))
		if err == nil {
			t.Fatal("Expected error for GraphQL errors, got nil")
		}
		if !strings.Contains(err.Error(), "api returned errors: Error 1, Error 2") {
			t.Errorf("Expected 'api returned errors' error, got %v", err)
		}
	})
}

func TestFetchReposForOwner(t *testing.T) {
	page := 0
	client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
		var reqBody graphQLRequest
		err := json.NewDecoder(r.Body).Decode(&reqBody)
		if err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		var resp []byte
		if page == 0 {
			resp = []byte(`{"data":{"repositoryOwner":{"repositories":{"nodes":[
{"name":"repo1","defaultBranchRef":{"name":"main","target":{"oid":"sha1"}}},
{"name":"excluded-repo","defaultBranchRef":{"name":"main","target":{"oid":"sha-excluded"}}}],
"pageInfo":{"hasNextPage":true,"endCursor":"cursor1"}}}}}`)
			page++
		} else if page == 1 {
			resp = []byte(`{"data":{"repositoryOwner":{"repositories":{"nodes":[
{"name":"repo2","defaultBranchRef":{"name":"dev","target":{"oid":"sha2"}}}],
"pageInfo":{"hasNextPage":false}}}}}`)
			page++
		} else {
			t.Errorf("Unexpected call to mock server on page %d", page)
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(resp)
	})
	defer server.Close()

	serverConfig := &config.Server{
		Name:    "test-server",
		ApiURL:  server.URL,
		Exclude: "excluded-repo",
	}
	repoMap := make(map[string]config.Repository)

	err := fetchReposForOwner(client, serverConfig, "test-owner", repoMap)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	expectedRepos := map[string]config.Repository{
		"test-server/test-owner/repo1": {
			Server: "test-server", Owner: "test-owner", Name: "repo1", Branch: "main", Commit: "sha1",
		},
		"test-server/test-owner/repo2": {
			Server: "test-server", Owner: "test-owner", Name: "repo2", Branch: "dev", Commit: "sha2",
		},
	}

	if !reflect.DeepEqual(repoMap, expectedRepos) {
		t.Errorf("Expected repos to match:\nExpected: %+v\nGot: %+v", expectedRepos, repoMap)
	}
}

func TestFetchSpecificRepos(t *testing.T) {
	t.Run("specific repos with branches and SHAs", func(t *testing.T) {
		client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
			var reqBody graphQLRequest
			_ = json.NewDecoder(r.Body).Decode(&reqBody)
			if regexp.MustCompile(`\s+`).ReplaceAllString(reqBody.Query, " ") != "query { "+
				"repo_0: repository(owner: \"test-owner\", name: \"repoA\") { requestedRef: object(expression: \"refs/heads/feature\") { oid } } "+
				"repo_1: repository(owner: \"test-owner\", name: \"repoB\") { defaultBranchRef { name, target { oid } } } }" {
				t.Errorf("Unexpected query: %s", reqBody.Query)
			}

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":{
"repo_0":{"requestedRef":{"oid":"sha-feature"}},
"repo_1":{"defaultBranchRef":{"name":"main","target":{"oid":"sha-main"}}}}}`))
		})
		defer server.Close()

		serverConfig := &config.Server{
			Name:   "test-server",
			ApiURL: server.URL,
		}
		requests := []config.Include{
			{Owner: "test-owner", Name: "repoA", Ref: "feature"},
			{Owner: "test-owner", Name: "repoB", Ref: ""},                                         // No ref, should get default
			{Owner: "test-owner", Name: "repoC", Ref: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"}, // Direct SHA
			{Owner: "test-owner", Name: "excluded-specific", Ref: ""},
		}
		serverConfig.Exclude = "excluded-specific"

		repoMap := make(map[string]config.Repository)
		err := fetchSpecificRepos(client, serverConfig, requests, repoMap)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		expectedRepos := map[string]config.Repository{
			"test-server/test-owner/repoA": {
				Server: "test-server", Owner: "test-owner", Name: "repoA", Branch: "feature", Commit: "sha-feature",
			},
			"test-server/test-owner/repoB": {
				Server: "test-server", Owner: "test-owner", Name: "repoB", Branch: "main", Commit: "sha-main",
			},
			"test-server/test-owner/repoC": {
				Server: "test-server", Owner: "test-owner", Name: "repoC", Branch: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0", Commit: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
			},
		}

		if !reflect.DeepEqual(repoMap, expectedRepos) {
			t.Errorf("Expected repos to match:\nExpected: %+v\nGot: %+v", expectedRepos, repoMap)
		}
	})

	t.Run("all specific repos excluded", func(t *testing.T) {
		client, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("Mock server should not be called if all repos are excluded")
		})
		defer server.Close()

		serverConfig := &config.Server{
			Name:    "test-server",
			ApiURL:  server.URL,
			Exclude: ".*", // Exclude all
		}
		requests := []config.Include{
			{Owner: "test-owner", Name: "repoA", Ref: "feature"},
		}

		repoMap := make(map[string]config.Repository)
		err := fetchSpecificRepos(client, serverConfig, requests, repoMap)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if len(repoMap) != 0 {
			t.Errorf("Expected 0 repos, got %d", len(repoMap))
		}
	})
}

func TestGetAllRepositories(t *testing.T) {
	ownerPage := 0
	_, server := createMockServer(func(w http.ResponseWriter, r *http.Request) {
		var reqBody graphQLRequest
		_ = json.NewDecoder(r.Body).Decode(&reqBody)

		var query string
		var variables string
		if strings.Contains(reqBody.Query, "GetRepositories") {
			var resp []byte
			query = ownerRepositoriesQuery
			if ownerPage == 0 {
				variables = `{"cursor":null,"owner":"test-owner-all"}`
				resp = []byte(`{"data":{"repositoryOwner":{"repositories":{"nodes":[
{"name":"owner-repo1","defaultBranchRef":{"name":"main","target":{"oid":"owner-sha1"}}}],
"pageInfo":{"hasNextPage":true,"endCursor":"owner-cursor1"}}}}}`)
				ownerPage++
			} else {
				variables = `{"cursor":"owner-cursor1","owner":"test-owner-all"}`
				resp = []byte(`{"data":{"repositoryOwner":{"repositories":{"nodes":[
{"name":"owner-repo2","defaultBranchRef":{"name":"dev","target":{"oid":"owner-sha2"}}}],
"pageInfo":{"hasNextPage":false}}}}}`)
			}
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(resp)
		} else {
			query = `query { repo_0: repository(owner: "test-owner", name: "specific-repo1") { defaultBranchRef { name, target { oid } } } }`
			variables = `null`
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":{"repo_0":{"defaultBranchRef":{"name":"master","target":{"oid":"specific-sha1"}}}}}`))
		}

		re := regexp.MustCompile(`\s+`)
		if re.ReplaceAllString(reqBody.Query, " ") != re.ReplaceAllString(query, " ") {
			t.Errorf("Unexpected query: %s", reqBody.Query)
		}
		if v, _ := json.Marshal(reqBody.Variables); string(v) != variables {
			t.Errorf("Unexpected variables: %s", string(v))
		}
	})
	defer server.Close()

	cfg := &config.Config{
		Servers: map[string]*config.Server{
			"github": {
				Name:   "github.com",
				ApiURL: server.URL,
				Include: []config.Include{
					{Owner: "test-owner-all"},                              // Fetch all for this owner
					{Owner: "test-owner", Name: "specific-repo1", Ref: ""}, // Fetch specific repo
					{Owner: "test-owner", Name: "specific-sha-repo", Ref: "c1d2e3f4c5d6e7f8c9d0e1f2a3b4c5d6e7f8c9d0"}, // Specific SHA
				},
				Exclude: "not-to-be-included",
			},
		},
	}

	repos, err := GetAllRepositories(cfg, false)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	expectedRepos := []config.Repository{
		{Server: "github.com", Owner: "test-owner-all", Name: "owner-repo1", Branch: "main", Commit: "owner-sha1"},
		{Server: "github.com", Owner: "test-owner-all", Name: "owner-repo2", Branch: "dev", Commit: "owner-sha2"},
		{Server: "github.com", Owner: "test-owner", Name: "specific-repo1", Branch: "master", Commit: "specific-sha1"},
		{Server: "github.com", Owner: "test-owner", Name: "specific-sha-repo", Branch: "c1d2e3f4c5d6e7f8c9d0e1f2a3b4c5d6e7f8c9d0", Commit: "c1d2e3f4c5d6e7f8c9d0e1f2a3b4c5d6e7f8c9d0"},
	}

	if !reflect.DeepEqual(repos, expectedRepos) {
		t.Errorf("Expected repos to match:\nExpected: %+v\nGot: %+v", expectedRepos, repos)
	}
}
