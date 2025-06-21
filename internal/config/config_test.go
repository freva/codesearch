package config

import (
	"os"
	"path"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// Helper function to create a temporary config file for testing
func createTempConfigFile(t *testing.T, content string) string {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "test_config.conf")
	err := os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		t.Fatalf("Failed to create temporary config file: %v", err)
	}
	return filePath
}

func assertEqualConfig(t *testing.T, configPath string, expected *Config) {
	cfg, err := ReadConfig(configPath)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if !reflect.DeepEqual(cfg, expected) {
		t.Errorf("Config mismatch:\nExpected: %+v\nGot: %+v", expected, cfg)
	}
}

func assertConfigError(t *testing.T, content, errorMessage string) {
	configPath := createTempConfigFile(t, content)
	_, err := ReadConfig(configPath)
	if err == nil {
		t.Fatal("Expected error, got nil")
	}
	if !strings.Contains(err.Error(), errorMessage) {
		t.Errorf("Expected error to contain '%s', got '%s'", err, err.Error())
	}
}

func TestReadConfig(t *testing.T) {
	t.Run("valid minimal config file", func(t *testing.T) {
		content := `
workdir = ./data
webdir = ../web/dir

[server github]
url = git@github.com
exclude = ^my-org/private-.*
include = my-org/public-repo#main
include = another-org/repo2
include = single-owner

[server internal]
api = https://api.git.example.com
token = my-secret-token
url = https://my-secret-token@git.example.com
weburl = https://git.example.com
include = internal-org/internal-repo
`
		configPath := createTempConfigFile(t, content)
		configFileDir := filepath.Dir(configPath)
		expected := &Config{
			CodeDir:       path.Join(configFileDir, "data/code"),
			CodeIndexPath: path.Join(configFileDir, "data/csearch.index"),
			FileIndexPath: path.Join(configFileDir, "data/csearch.fileindex"),
			FileListsDir:  path.Join(configFileDir, "data/filelists"),
			ManifestPath:  path.Join(configFileDir, "data/manifest.json"),
			Port:          80,
			WebDir:        path.Join(configFileDir, "../web/dir"),
			Servers: map[string]*Server{
				"github": {
					Name:     "github",
					ApiURL:   "https://api.github.com",
					CloneURL: "git@github.com",
					WebURL:   "https://github.com",
					Exclude:  "^my-org/private-.*",
					Include: []Include{
						{Owner: "my-org", Name: "public-repo", Ref: "main"},
						{Owner: "another-org", Name: "repo2"},
						{Owner: "single-owner"},
					},
				},
				"internal": {
					Name:     "internal",
					ApiURL:   "https://api.git.example.com",
					CloneURL: "https://my-secret-token@git.example.com",
					WebURL:   "https://git.example.com",
					Token:    "my-secret-token",
					Exclude:  "",
					Include:  []Include{{Owner: "internal-org", Name: "internal-repo"}},
				},
			},
			configPath:    configPath,
			configFileDir: configFileDir,
			workDir:       path.Join(configFileDir, "data"),
		}
		assertEqualConfig(t, configPath, expected)
	})

	t.Run("file paths override", func(t *testing.T) {
		content := `
code=/absolute/path/to/code
index=c.idx
fileindex = fileindex.idx
filelists = data/../filelists
manifest   = mf.json
port=1234
webdir= ../web/dir
workdir =~/data
`
		configPath := createTempConfigFile(t, content)
		configFileDir := filepath.Dir(configPath)
		home, _ := os.UserHomeDir()
		expected := &Config{
			CodeDir:       "/absolute/path/to/code",
			CodeIndexPath: path.Join(configFileDir, "c.idx"),
			FileIndexPath: path.Join(configFileDir, "fileindex.idx"),
			FileListsDir:  path.Join(configFileDir, "filelists"),
			ManifestPath:  path.Join(configFileDir, "mf.json"),
			Port:          1234,
			WebDir:        path.Join(configFileDir, "../web/dir"),
			Servers:       map[string]*Server{},
			configPath:    configPath,
			configFileDir: configFileDir,
			workDir:       path.Join(home, "data"),
		}
		assertEqualConfig(t, configPath, expected)
	})

	t.Run("config file does not exist", func(t *testing.T) {
		_, err := ReadConfig("non_existent_config.conf")
		if err == nil {
			t.Fatal("Expected error for non-existent file, got nil")
		}
		if !strings.Contains(err.Error(), "config file does not exist") {
			t.Errorf("Expected 'config file does not exist' error, got %v", err)
		}
	})

	t.Run("missing required global settings", func(t *testing.T) {
		content := `
# Missing workdir and webdir
[server github]
url = https://github.com
weburl = https://github.com
`
		assertConfigError(t, content, "missing required 'webdir' setting")
	})

	t.Run("missing required server settings", func(t *testing.T) {
		content := `
workdir = ./data
webdir = /var/www/html

[server github]
api = https://api.github.com
# Missing url
`
		assertConfigError(t, content, "server 'github' missing required 'url' setting")
	})

	t.Run("invalid line format", func(t *testing.T) {
		content := `
workdir = ./data
invalid line
`
		assertConfigError(t, content, "invalid line format: invalid line")
	})

	t.Run("invalid port number", func(t *testing.T) {
		content := `
port = abc
workdir = ./data
webdir = /var/www/html
`
		assertConfigError(t, content, "invalid port number: abc")
	})

	t.Run("unknown global key", func(t *testing.T) {
		content := `
unknown_global = value
workdir = ./data
webdir = /var/www/html
`
		assertConfigError(t, content, ":2: unknown global configuration key: 'unknown_global'")
	})

	t.Run("unknown server key", func(t *testing.T) {
		content := `
workdir = ./data
webdir = /var/www/html
[server test]
api = test
url = test
weburl = test
unknown_server_key = value
`
		assertConfigError(t, content, ":8: unknown key 'unknown_server_key' in server 'test'")
	})

	t.Run("invalid exclude regex", func(t *testing.T) {
		content := `
workdir = ./data
webdir = /var/www/html
[server test]
api = test
url = test
weburl = test
exclude = [invalid regex
`
		assertConfigError(t, content, "invalid regex for 'exclude': error parsing regexp: missing closing ]: `[invalid regex`")
	})

	t.Run("invalid include format", func(t *testing.T) {
		content := `
workdir = ./data
webdir = /var/www/html
[server test]
api = test
url = test
weburl = test
include = invalid/format/with/too/many/slashes
`
		assertConfigError(t, content, "invalid include format: invalid/format/with/too/many/slashes")
	})
}
