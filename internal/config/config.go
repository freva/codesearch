package config

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Include struct {
	Owner string
	Name  string
	Ref   string // The branch or commit
}

// Server holds configuration for a git server
type Server struct {
	Name    string
	API     string
	URL     string
	WebURL  string
	Token   string
	Exclude regexp.Regexp
	Include []Include
}

// Config is the top-level struct holding all parsed configuration
type Config struct {
	// --- Public Fields ---

	// Global settings
	CodeDir       string
	CodeIndexPath string
	FileIndexPath string
	ManifestPath  string
	Port          int
	WebDir        string
	WorkDir       string

	// Sections
	Servers map[string]*Server

	// --- Private Fields ---
	configPath    string // Absolute path to the config file
	configFileDir string // Directory of the config file
}

// Repository represents a resolved repository with its source details.
type Repository struct {
	Server string `json:"server"` // Name of the server from Config.Servers
	Owner  string `json:"owner"`  // GitHub owner (name of org or user)
	Name   string `json:"name"`   // Name of the repository
	Branch string `json:"branch"` // Branch (or commit if Include.Ref was a commit) to check out
	Commit string `json:"commit"` // Commit hash to check out
}

func (r Repository) RepoDir() string {
	return fmt.Sprintf("%s/%s/%s", r.Server, r.Owner, r.Name)
}

type Manifest struct {
	Servers      map[string]string      `json:"servers"`      // Server API URL by server name
	Repositories map[string]*Repository `json:"repositories"` // Repository details by path prefix
	UpdatedAt    time.Time              `json:"updated_at"`   // Timestamp of the last update
}

var includePattern = regexp.MustCompile(`^[a-zA-Z0-9-]+(?:/[a-zA-Z0-9-._]+(?:#[^\s]+)?)?$`)

func ReadManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest at '%s': %w", path, err)
	}

	var manifest *Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("failed to unmarshal manifest at '%s': %w", path, err)
	}
	return manifest, nil
}

// ReadConfig parses Config from the given path.
func ReadConfig(path string) (*Config, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path for '%s': %w", path, err)
	}
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file does not exist: %s", absPath)
	}

	file, err := os.Open(absPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var c = &Config{
		Servers:       make(map[string]*Server),
		Port:          80, // Default port
		configPath:    absPath,
		configFileDir: filepath.Dir(absPath),
	}
	err = c.parseConfig(file)
	if err != nil {
		return nil, fmt.Errorf("error parsing config file '%s': %w", absPath, err)
	}
	return c, nil
}

func (c *Config) parseConfig(file *os.File) error {
	// Regex for parsing section headers, e.g., [server github]
	sectionRegex := regexp.MustCompile(`^\s*\[\s*(server)\s+([^]]+)\s*]`)
	// Regex for parsing key-value pairs, e.g., workdir = /path/to/db
	assignRegex := regexp.MustCompile(`^\s*([a-zA-Z0-9_.-]+)\s*=\s*(.+)`)

	var currentServer *Server

	scanner := bufio.NewScanner(file)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue // Skip empty lines and comments
		}

		loc := fmt.Sprintf("%s:%d", filepath.Base(c.configPath), lineNum)

		if matches := sectionRegex.FindStringSubmatch(line); len(matches) == 3 {
			// A new section has started, reset current context
			currentServer = nil

			sectionType := matches[1]
			sectionName := strings.TrimSpace(matches[2])

			switch sectionType {
			case "server":
				currentServer = &Server{Name: sectionName}
				c.Servers[sectionName] = currentServer
			}
		} else if matches := assignRegex.FindStringSubmatch(line); len(matches) == 3 {
			key := matches[1]
			value := strings.TrimSpace(matches[2])

			// Are we in a server section?
			if currentServer != nil {
				if err := c.parseServerVar(currentServer, key, value, loc); err != nil {
					return err
				}
			} else {
				// Global variable
				if err := c.parseGlobalVar(key, value, loc); err != nil {
					return err
				}
			}
		} else {
			return fmt.Errorf("%s: invalid line format: %s", loc, scanner.Text())
		}
	}

	for name, server := range c.Servers {
		if server.API == "" {
			return fmt.Errorf("%s: server '%s' missing required 'api' setting", c.configPath, name)
		}
		if server.URL == "" {
			return fmt.Errorf("%s: server '%s' missing required 'url' setting", c.configPath, name)
		}
		if server.WebURL == "" {
			return fmt.Errorf("%s: server '%s' missing required 'weburl' setting", c.configPath, name)
		}
	}

	if c.WebDir == "" {
		return fmt.Errorf("%s: missing required 'webdir' setting", c.configPath)
	}
	if c.WorkDir == "" {
		return fmt.Errorf("%s: missing required 'workdir' setting", c.configPath)
	}
	if c.CodeDir == "" {
		c.CodeDir = filepath.Join(c.WorkDir, "code")
	}
	if c.FileIndexPath == "" {
		c.FileIndexPath = filepath.Join(c.WorkDir, "csearch.fileindex")
	}
	if c.CodeIndexPath == "" {
		c.CodeIndexPath = filepath.Join(c.WorkDir, "csearch.index")
	}
	if c.ManifestPath == "" {
		c.ManifestPath = filepath.Join(c.WorkDir, "manifest.json")
	}

	return scanner.Err()
}

// Help provides the help text describing the config file format.
func Help() string {
	return `The config file has the following format:

  config-file: global-section section*
  global-section: assign*
  section: '[' name S value ']' assign*
  assign: key '=' value

Global settings:
  'code': Directory to contain source to check out and index. [workdir/code]
  'fileindex': Path to file index file. [workdir/csearch.fileindex]
  'index': Path to codesearch index file. [workdir/csearch.index]
  'port':  Port cserver should listen to. [80]
  'manifest': Path to the manifest file. [workdir/manifest.json]
  'webdir': Path to freva/codesearch/cmd/cserver/static. Required.
  'workdir': The working directory owned and managed by this program. Required.
The 'server' section names a GitHub server and allows these settings:
  'api': URL to GitHub REST API.**
  'exclude': Excludes all ORG/REPO matching the regex. At most 1.
  'include': Either
             OWNER - user/organisation name, will check out all of their repositories, or
             OWNER/REPO - a specific repository, or
             OWNER/REPO#BRANCH - a specific repository at a specific branch, or
			 OWNER/REPO#REF - a specific repository at a specific commit.
  'token': An OAuth2 token, e.g. a personal access token.
  'url': Base URL for cloning: git@github.com, https://github.com. Required.
*) The path is relative to the config file, if relative.
**) Required for some operations.`
}

func (c *Config) parseGlobalVar(key, value, loc string) (err error) {
	switch key {
	case "code":
		c.CodeDir, err = c.resolvePath(value)
	case "fileindex":
		c.FileIndexPath, err = c.resolvePath(value)
	case "index":
		c.CodeIndexPath, err = c.resolvePath(value)
	case "manifest":
		c.ManifestPath, err = c.resolvePath(value)
	case "webdir":
		c.WebDir, err = c.resolvePath(value)
	case "workdir":
		c.WorkDir, err = c.resolvePath(value)
	case "port":
		c.Port, err = strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("%s: invalid port number: %s", loc, value)
		}
	default:
		return fmt.Errorf("%s: unknown global configuration key: '%s'", loc, key)
	}
	return err
}

// resolvePath returns absolute path, relative paths are resolved relative to config file.
func (c *Config) resolvePath(p string) (string, error) {
	if strings.HasPrefix(p, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		p = filepath.Join(home, p[1:])
	}
	if !filepath.IsAbs(p) {
		p = filepath.Join(c.configFileDir, p)
	}
	return filepath.Clean(p), nil
}

func (c *Config) parseServerVar(s *Server, key, value, loc string) error {
	switch key {
	case "api":
		s.API = value
	case "url":
		s.URL = value
	case "weburl":
		s.WebURL = value
	case "token":
		s.Token = value
	case "exclude":
		exclude, err := regexp.Compile(value)
		if err != nil {
			return fmt.Errorf("%s: invalid regex for 'exclude': %w", loc, err)
		}
		s.Exclude = *exclude
	case "include":
		if !includePattern.MatchString(value) {
			return fmt.Errorf("%s: invalid include format: %s", loc, value)
		}

		// Check for a ref/branch part
		var owner, name, ref string
		if strings.Contains(value, "#") {
			parts := strings.SplitN(value, "#", 2)
			value = parts[0]
			ref = parts[1]
		}

		// Check for owner/name part
		if strings.Contains(value, "/") {
			parts := strings.SplitN(value, "/", 2)
			owner = parts[0]
			name = parts[1]
		} else {
			// If no slash, it's an owner-only include
			owner = value
		}

		s.Include = append(s.Include, Include{Owner: owner, Name: name, Ref: ref})
	default:
		return fmt.Errorf("%s: unknown key '%s'", loc, key)
	}
	return nil
}
