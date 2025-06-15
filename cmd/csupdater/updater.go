package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path"
	"time"

	"github.com/hakonhall/codesearch/internal/config"
)

// AppArgs holds the parsed command-line arguments.
type AppArgs struct {
	ConfigFile string
	DoManifest bool
	DoSync     bool
	DoIndex    bool
	Verbose    bool
	HelpConfig bool
}

func main() {
	args := AppArgs{}
	flag.StringVar(&args.ConfigFile, "config", "", "Path to config file (required).")
	flag.BoolVar(&args.DoManifest, "manifest", false, "Update the manifest (only).")
	flag.BoolVar(&args.DoSync, "sync", false, "Synchronize git repos (only).")
	flag.BoolVar(&args.DoIndex, "index", false, "Update the search indices (only).")
	flag.BoolVar(&args.Verbose, "verbose", false, "Enable verbose output.")
	flag.BoolVar(&args.HelpConfig, "help-config", false, "Show help for the config file format.")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, `Usage: updater [OPTION...]
Update the manifest, synchronize the git repos, and update the indices.

Options:
`)
		flag.PrintDefaults()
	}

	flag.Parse()

	if args.HelpConfig {
		fmt.Println(config.Help())
		return
	}
	if args.ConfigFile == "" {
		log.Fatal("Error: --config flag is required. See --help for usage.")
	}

	// If no specific action is chosen, default to running all actions.
	if !args.DoManifest && !args.DoSync && !args.DoIndex {
		args.DoManifest = true
		args.DoSync = true
		args.DoIndex = true
	}

	err := run(args)
	if err != nil {
		log.Printf("ERROR: %v", err)
		os.Exit(1)
	}
}

func run(args AppArgs) error {
	cfg, err := config.ReadConfig(args.ConfigFile)
	if err != nil {
		return fmt.Errorf("could not parse cfg file: %w", err)
	}

	if args.DoManifest {
		if err := updateManifest(cfg, args.Verbose); err != nil {
			return fmt.Errorf("manifest update failed: %w", err)
		}
	}

	if args.DoSync {
		if err := SyncRepos(cfg, args.Verbose); err != nil {
			return fmt.Errorf("repository sync failed: %w", err)
		}
	}

	if args.DoIndex {
		if err := UpdateIndices(cfg, args.Verbose); err != nil {
			return fmt.Errorf("indexing failed: %w", err)
		}
	}

	return nil
}

func updateManifest(cfg *config.Config, verbose bool) error {
	start := time.Now()
	repos, err := GetAllRepositories(cfg, verbose)
	if err != nil {
		return fmt.Errorf("could not fetch repositories: %w", err)
	}

	servers := make(map[string]string)
	for name, server := range cfg.Servers {
		servers[name] = server.WebURL
	}
	reposByPrefix := make(map[string]*config.Repository)
	for _, repo := range repos {
		reposByPrefix[repo.RepoDir()] = &repo
	}
	serialized, err := json.MarshalIndent(&config.Manifest{
		Servers:      servers,
		Repositories: reposByPrefix,
		UpdatedAt:    time.Now(),
	}, "", "    ")
	if err != nil {
		return fmt.Errorf("could not marshal manifest: %w", err)
	}
	if err := atomicWriteFile(cfg.ManifestPath, serialized); err != nil {
		return fmt.Errorf("could not write manifest file: %w", err)
	}
	log.Printf("Found %d repositories for %d servers in %s.\n", len(repos), len(cfg.Servers), time.Since(start).Round(10*time.Millisecond))
	return nil
}

func atomicWriteFile(filePath string, data []byte) error {
	tmpPath := path.Join(path.Dir(filePath), path.Base(filePath)+".tmp")
	tmpFile, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}

	defer func() {
		// If the rename operation succeeds, this remove will fail, which is fine.
		// If the rename fails, this will clean up the lingering temp file.
		os.Remove(tmpPath)
	}()

	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to write data to temporary file: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close temporary file: %w", err)
	}

	if err := os.Rename(tmpPath, filePath); err != nil {
		return fmt.Errorf("failed to rename temporary file to final path: %w", err)
	}

	return nil
}
