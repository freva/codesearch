package main

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/freva/codesearch/internal/config"
)

// SyncRepos clones new repos, updates existing ones, and removes any that are no longer needed.
func SyncRepos(cfg *config.Config) error {
	manifest, err := config.ReadManifest(cfg.ManifestPath)
	if err != nil {
		return err
	}

	orphans, err := listWithMaxDepth(cfg.CodeDir, 2)
	if err != nil {
		return fmt.Errorf("could not scan for orphaned directories: %w", err)
	}

	for _, repo := range manifest.Repositories {
		delete(orphans, repo.RepoDir())

		localPath := filepath.Join(cfg.CodeDir, repo.RepoDir())
		if _, err := os.Stat(localPath); os.IsNotExist(err) {
			err := cloneRepo(cfg, repo, localPath)
			if err != nil {
				return fmt.Errorf("ERROR: Failed to clone %s: %w", repo.RepoDir(), err)
			}
		} else {
			err := updateRepo(cfg, repo, localPath)
			if err != nil {
				return fmt.Errorf("ERROR: Failed to update %s: %w", repo.RepoDir(), err)
			}
		}
	}

	cleanupOrphans(orphans, cfg.CodeDir)
	return nil
}

// cloneRepo handles cloning a new repository.
func cloneRepo(config *config.Config, repo *config.Repository, localPath string) error {
	serverConfig, ok := config.Servers[repo.Server]
	if !ok {
		return fmt.Errorf("no server config found for '%s'", repo.Server)
	}

	cloneURL, err := buildCloneURL(serverConfig.URL, repo.Owner, repo.Name)
	if err != nil {
		return fmt.Errorf("could not build clone URL: %w", err)
	}

	log.Printf("%s: Cloning", repo.RepoDir())
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return err
	}

	err = runGitCommand("clone", cloneURL, localPath)
	if err != nil {
		return err
	}

	return runGitCommand("-C", localPath, "checkout", "--quiet", repo.Commit)
}

// updateRepo handles updating an existing local repository.
func updateRepo(config *config.Config, repo *config.Repository, localPath string) error {
	if info, err := os.Stat(filepath.Join(localPath, ".git", "index")); err != nil || info.Size() == 0 {
		log.Printf("WARNING: Corrupt .git/index found in %s. Removing directory.", localPath)
		err = os.RemoveAll(localPath)
		if err != nil {
			return fmt.Errorf("failed to remove corrupt repository: %w", err)
		}
		return cloneRepo(config, repo, localPath)
	}

	output, err := exec.Command("git", "-C", localPath, "rev-parse", "HEAD").CombinedOutput()
	if err != nil {
		log.Printf("could not determine current commit: %v", err)
	} else if strings.TrimSpace(string(output)) == repo.Commit {
		log.Printf("%s: Already up-to-date", repo.RepoDir())
		return nil
	}

	log.Printf("%s: Updating", repo.RepoDir())
	if err := runGitCommand("-C", localPath, "fetch", "--quiet"); err != nil {
		return err
	}
	return runGitCommand("-C", localPath, "checkout", "--quiet", repo.Commit)
}

func runGitCommand(args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("git %+q failed: %w", args, err)
	}
	return nil
}

// buildCloneURL constructs a valid git clone URL based on the logic from the original shell script.
func buildCloneURL(baseURL, owner, repoName string) (string, error) {
	repoPath := fmt.Sprintf("%s/%s.git", owner, repoName)

	if strings.HasPrefix(baseURL, "https://") || strings.HasPrefix(baseURL, "ssh://") {
		u, err := url.Parse(baseURL)
		if err != nil {
			return "", fmt.Errorf("failed to parse URL '%s': %w", baseURL, err)
		}
		u.Path = path.Join(u.Path, repoPath)
		return u.String(), nil
	}

	// Handle SCP-like syntax, e.g., "git@github.com"
	scpPattern := regexp.MustCompile(`^(?:[a-zA-Z0-9_.-]+@)?[a-z][a-z0-9-]+\.[a-z][a-z0-9.-]+$`)
	if scpPattern.MatchString(baseURL) {
		// For SCP syntax, the separator between host and path is a colon.
		return fmt.Sprintf("%s:%s", baseURL, repoPath), nil
	}

	return "", fmt.Errorf("unsupported or malformed URL format: '%s'", baseURL)
}

// cleanupOrphans removes all directories remaining in the orphan map.
func cleanupOrphans(orphans map[string]bool, codeDir string) {
	if len(orphans) == 0 {
		return
	}

	dirsToRemove := make([]string, 0, len(orphans))
	for dir := range orphans {
		dirsToRemove = append(dirsToRemove, dir)
	}

	// Sort keys to ensure child directories are removed before parents
	sort.Sort(sort.Reverse(sort.StringSlice(dirsToRemove)))

	for _, dir := range dirsToRemove {
		log.Printf("Removing orphaned path: %s", dir)
		fullPath := filepath.Join(codeDir, dir)
		if err := os.RemoveAll(fullPath); err != nil {
			log.Printf("ERROR: Failed to remove %s: %v", fullPath, err)
		}
	}
}

// listWithMaxDepth returns all paths under given root path, relative to it, within a given max depth.
func listWithMaxDepth(root string, maxDepth int) (map[string]bool, error) {
	paths := make(map[string]bool)
	cleanedRoot := filepath.Clean(root)

	err := filepath.WalkDir(cleanedRoot, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(cleanedRoot, path)
		if err != nil {
			return err
		}

		if relPath == "." {
			return nil
		}

		delete(paths, filepath.Dir(relPath))
		paths[relPath] = true
		if d.IsDir() && strings.Count(relPath, string(os.PathSeparator)) == maxDepth {
			return filepath.SkipDir
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return paths, nil
}
