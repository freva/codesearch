package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/freva/codesearch/internal/config"
)

type mockCmd struct {
	expectedCmdArgs []string
	stdout          string
	stderr          string
	err             error
}

func (mc *mockCmd) Run(stdout io.Writer, stderr io.Writer) error {
	if _, err := stdout.Write([]byte(mc.stdout)); err != nil {
		return err
	}
	if _, err := stderr.Write([]byte(mc.stderr)); err != nil {
		return err
	}
	return mc.err
}
func (mc *mockCmd) CombinedOutput() ([]byte, error) {
	if mc.err != nil {
		return nil, mc.err
	}
	return []byte(mc.stdout + mc.stderr), nil
}

func setMockGitCommand(t *testing.T, entries []mockCmd) func() {
	originalCommand := command

	command = func(name string, args ...string) IShellCommand {
		if len(entries) == 0 {
			t.Fatalf("No more git command mocks expected for %s %v", name, args)
		}

		nextMock := entries[0]
		entries = entries[1:]

		actualCmdArgs := append([]string{name}, args...)
		if !reflect.DeepEqual(actualCmdArgs, nextMock.expectedCmdArgs) {
			t.Fatalf("Mock mismatch:\nExpected: %v\nActual:   %v\nRemaining mocks: %+v",
				nextMock.expectedCmdArgs, actualCmdArgs, entries)
		}

		return &nextMock
	}

	return func() {
		command = originalCommand
		if len(entries) > 0 {
			t.Errorf("Not all mock commands were used. Remaining mocs: %+v", entries)
		}
	}
}

func createDummyManifest(t *testing.T, path string, repos []*config.Repository) {
	manifest := &config.Manifest{
		Servers:      make(map[string]string),
		Repositories: make(map[string]*config.Repository),
		UpdatedAt:    time.Now(),
	}
	for _, repo := range repos {
		manifest.Repositories[repo.RepoDir()] = repo
		if _, ok := manifest.Servers[repo.Server]; !ok {
			manifest.Servers[repo.Server] = "http://mock-api.com/" + repo.Server
		}
	}
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal manifest: %v", err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		t.Fatalf("Failed to write manifest file: %v", err)
	}
}

func TestBuildCloneURL(t *testing.T) {
	tests := []struct{ name, baseURL, expected string }{
		{name: "HTTPS URL", baseURL: "https://github.com", expected: "https://github.com/owner/repo.git"},
		{name: "SSH URL", baseURL: "ssh://git@github.com", expected: "ssh://git@github.com/owner/repo.git"},
		{name: "SCP-like URL", baseURL: "git@github.com", expected: "git@github.com:owner/repo.git"},
		{name: "SCP-like URL with subdomain", baseURL: "git@sub.domain.com", expected: "git@sub.domain.com:owner/repo.git"},
		{name: "Malformed URL", baseURL: "http://%gh.com", expected: ""},
		{name: "Unsupported format", baseURL: "ftp://host.com", expected: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := buildCloneURL(tt.baseURL, "owner", "repo")
			expectErr := tt.expected == ""
			if (err != nil) != expectErr {
				t.Errorf("Expected error: %v, Got error: %v", expectErr, err)
			}
			if actual != tt.expected {
				t.Errorf("Expected URL '%s', Got '%s'", tt.expected, actual)
			}
		})
	}
}

func TestUpdateRepo(t *testing.T) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	tempDir := t.TempDir()
	localPath := filepath.Join(tempDir, "test-repo")
	os.MkdirAll(filepath.Join(localPath, ".git"), 0755)

	repo := &config.Repository{
		Server: "github", Owner: "test-owner", Name: "test-repo",
		Branch: "main", Commit: "newsha1234567890123456789012345678901234567890",
	}

	t.Run("repo already up-to-date", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "-C", localPath, "rev-parse", "HEAD"}, stdout: repo.Commit + "\n"},
		})

		updated, err := updateRepo(repo, localPath, false)
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if updated {
			t.Error("Expected repo to be not updated, but it was")
		}
	})

	t.Run("repo needs update and succeeds", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "-C", localPath, "rev-parse", "HEAD"}, stdout: "oldsha\n"},
			{expectedCmdArgs: []string{"git", "-C", localPath, "fetch"}, stdout: ""},
			{expectedCmdArgs: []string{"git", "-C", localPath, "checkout", repo.Commit}, stdout: ""},
		})

		updated, err := updateRepo(repo, localPath, false)
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if !updated {
			t.Error("Expected repo to be updated, but it was not")
		}
	})

	t.Run("rev-parse fails", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "-C", localPath, "rev-parse", "HEAD"}, stderr: "fatal: bad object\n", err: fmt.Errorf("exit status 1")},
			{expectedCmdArgs: []string{"git", "-C", localPath, "fetch"}, stdout: ""},
			{expectedCmdArgs: []string{"git", "-C", localPath, "checkout", repo.Commit}, stdout: ""},
		})

		updated, err := updateRepo(repo, localPath, false)
		if err != nil {
			t.Errorf("Expected no error from updateRepo when rev-parse fails but fetch/checkout succeed. Got error: %v", err)
		}
		if !updated {
			t.Error("Expected update process to continue and result in an update attempt despite rev-parse error.")
		}
	})

	t.Run("fetch fails", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "-C", localPath, "rev-parse", "HEAD"}, stdout: "oldsha\n"},
			{expectedCmdArgs: []string{"git", "-C", localPath, "fetch"}, stderr: "fatal: network error\n", err: fmt.Errorf("exit status 1")},
		})

		_, err := updateRepo(repo, localPath, false)
		if err == nil {
			t.Fatal("Expected error from fetch, got nil")
		}
		if !strings.Contains(err.Error(), `git ["-C"`) || !strings.Contains(err.Error(), `"fetch"] failed`) || !strings.Contains(err.Error(), "network error") {
			t.Errorf("Expected fetch error, got %v", err)
		}
	})

	t.Run("checkout fails", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "-C", localPath, "rev-parse", "HEAD"}, stdout: "oldsha\n"},
			{expectedCmdArgs: []string{"git", "-C", localPath, "fetch"}, stdout: ""},
			{expectedCmdArgs: []string{"git", "-C", localPath, "checkout", repo.Commit}, stderr: "fatal: branch not found\n", err: fmt.Errorf("exit status 1")},
		})

		_, err := updateRepo(repo, localPath, false)
		if err == nil {
			t.Fatal("Expected error from checkout, got nil")
		}
		if !strings.Contains(err.Error(), `git ["-C"`) || !strings.Contains(err.Error(), fmt.Sprintf(`"checkout" "%s"`, repo.Commit)) || !strings.Contains(err.Error(), "branch not found") {
			t.Errorf("Expected checkout error, got %v", err)
		}
	})
}

func TestCloneRepo(t *testing.T) {
	tempCodeDir := t.TempDir()
	localPath := filepath.Join(tempCodeDir, "github/owner/new-repo")

	cfg := &config.Config{
		Servers: map[string]*config.Server{
			"github": {
				Name:     "github",
				CloneURL: "https://github.com",
			},
		},
	}
	repo := &config.Repository{
		Server: "github", Owner: "owner", Name: "new-repo",
		Branch: "main", Commit: "mocksha1234567890123456789012345678901234567890",
	}

	t.Run("successful clone and checkout", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "clone", "https://github.com/owner/new-repo.git", localPath}, stdout: ""},
			{expectedCmdArgs: []string{"git", "-C", localPath, "checkout", repo.Commit}, stdout: ""},
		})

		err := cloneRepo(cfg, repo, localPath, false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if _, err := os.Stat(path.Dir(localPath)); os.IsNotExist(err) {
			t.Errorf("Expected cloned directory to exist at %s", localPath)
		}
	})

	t.Run("no server config found", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{})
		repo.Server = "nonexistent"
		err := cloneRepo(cfg, repo, localPath, false)
		if err == nil {
			t.Fatal("Expected error for missing server config, got nil")
		}
		if !strings.Contains(err.Error(), "no server config found for 'nonexistent'") {
			t.Errorf("Expected 'no server config' error, got %v", err)
		}
		repo.Server = "github"
	})

	t.Run("clone command fails", func(t *testing.T) {
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "clone", "https://github.com/owner/new-repo.git", localPath}, stderr: "fatal: clone failed\n", err: fmt.Errorf("exit status 1")},
		})

		err := cloneRepo(cfg, repo, localPath, false)
		if err == nil {
			t.Fatal("Expected error for clone failure, got nil")
		}
		if !strings.Contains(err.Error(), `git ["clone"`) || !strings.Contains(err.Error(), "clone failed") {
			t.Errorf("Expected clone failed error, got %v", err)
		}
	})
}

func TestListWithMaxDepth(t *testing.T) {
	tempRoot := t.TempDir()

	os.MkdirAll(filepath.Join(tempRoot, "dir1", "dir1_1", "dir_1_1_1", "dir_1_1_1_1"), 0755)
	os.MkdirAll(filepath.Join(tempRoot, "dir1", "dir1_1", "dir_1_1_2"), 0755)
	os.MkdirAll(filepath.Join(tempRoot, "dir2", "dir2_1", "dir_2_1_1"), 0755)
	os.MkdirAll(filepath.Join(tempRoot, "dir2", "dir3_1", "dir_3_1_1"), 0755)
	os.MkdirAll(filepath.Join(tempRoot, "dir2", "dir3_2"), 0755)
	os.MkdirAll(filepath.Join(tempRoot, "dir3"), 0755)

	t.Run("max depth 1", func(t *testing.T) {
		paths, err := listWithMaxDepth(tempRoot, 1)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		expected := map[string]bool{"dir1": true, "dir2": true, "dir3": true}
		if !reflect.DeepEqual(paths, expected) {
			t.Errorf("Expected %+v paths, got %+v", expected, paths)
		}
	})

	t.Run("max depth 2", func(t *testing.T) {
		paths, err := listWithMaxDepth(tempRoot, 2)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		expected := map[string]bool{
			"dir1/dir1_1": true, "dir2/dir2_1": true, "dir2/dir3_1": true, "dir2/dir3_2": true, "dir3": true,
		}
		if !reflect.DeepEqual(paths, expected) {
			t.Errorf("Expected %+v paths, got %+v", expected, paths)
		}
	})

	t.Run("non-existent root", func(t *testing.T) {
		_, err := listWithMaxDepth("/non/existent/path", 1)
		if err == nil || !strings.Contains(err.Error(), "no such file or directory") {
			t.Errorf("Expected 'no such file or directory' error, got %v", err)
		}
	})
}

func TestSyncRepos(t *testing.T) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	tempCodeDir := t.TempDir()
	tempManifestPath := filepath.Join(t.TempDir(), "manifest.json")

	cfg := &config.Config{
		CodeDir:      tempCodeDir,
		ManifestPath: tempManifestPath,
		Servers: map[string]*config.Server{
			"github": {
				Name:     "github",
				CloneURL: "https://github.com",
			},
		},
	}

	t.Run("remove orphaned repo", func(t *testing.T) {
		orphanPath := filepath.Join(tempCodeDir, "server/owner/orphan-repo")
		os.MkdirAll(orphanPath, 0755)
		os.WriteFile(filepath.Join(orphanPath, "README.md"), []byte(""), 0644)

		createDummyManifest(t, tempManifestPath, []*config.Repository{})
		setMockGitCommand(t, []mockCmd{})

		err := SyncRepos(cfg, false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if _, err := os.Stat(orphanPath); !os.IsNotExist(err) {
			t.Errorf("Expected orphan repo %s to be removed, but it still exists", orphanPath)
		}
	})

	t.Run("corrupt git index", func(t *testing.T) {
		repo := &config.Repository{
			Server: "github", Owner: "owner", Name: "corrupt-repo", Branch: "main", Commit: "corruptsha",
		}
		localPath := filepath.Join(tempCodeDir, repo.RepoDir())
		os.MkdirAll(filepath.Join(localPath, ".git"), 0755)

		createDummyManifest(t, tempManifestPath, []*config.Repository{repo})
		setMockGitCommand(t, []mockCmd{
			{expectedCmdArgs: []string{"git", "clone", "https://github.com/owner/corrupt-repo.git", localPath}, stdout: ""},
			{expectedCmdArgs: []string{"git", "-C", localPath, "checkout", repo.Commit}, stdout: ""},
		})

		err := SyncRepos(cfg, false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if _, err := os.Stat(filepath.Join(localPath)); !os.IsNotExist(err) {
			t.Errorf("Expected corrupt repo to be deleted before cloning: %v", err)
		}
	})

	t.Run("manifest read error", func(t *testing.T) {
		cfg.ManifestPath = filepath.Join(t.TempDir(), "nonexistent_manifest.json")
		err := SyncRepos(cfg, false)
		if err == nil || !strings.Contains(err.Error(), "failed to read manifest") && !strings.Contains(err.Error(), "no such file or directory") {
			t.Errorf("Expected manifest read error, got %v", err)
		}
		cfg.ManifestPath = tempManifestPath
	})
}
