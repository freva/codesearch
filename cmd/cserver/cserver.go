// Copyright 2011 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/freva/codesearch/internal/config"
)

var CONFIG *config.Config
var BRANCHES map[string]config.Repository

type File struct {
	Repository config.Repository
	Relpath    string
}

func (f File) ResolveServer() *config.Server {
	server, ok := CONFIG.Servers[f.Repository.Server]
	if !ok {
		log.Print("Failed to find " + f.Repository.Server + " in SERVERS")
	}
	return server
}

func readManifest(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read manifest '%s': %w", path, err)
	}

	var repositories []config.Repository
	if err := json.Unmarshal(data, &repositories); err != nil {
		return fmt.Errorf("failed to unmarshal manifest from '%s': %w", path, err)
	}

	BRANCHES = make(map[string]config.Repository)
	for _, repository := range repositories {
		BRANCHES[repository.RepoDir()] = repository
	}
	return nil
}

// path must be relative to the serving directory.
func resolvePath(path string) (*File, error) {
	prefix := path
	parts := strings.Split(path, "/")
	if len(parts) > 3 {
		prefix = filepath.Join(parts[:4]...)
	}

	branch, ok := BRANCHES[prefix]
	if ok {
		return &File{Repository: branch, Relpath: path[len(prefix)+1:]}, nil
	}
	return nil, fmt.Errorf("no such branch in manifest: %s", prefix)
}

func staticHandler(w http.ResponseWriter, r *http.Request) {
	file := "index.html"
	if strings.HasPrefix(r.URL.Path, "/static/") || strings.HasPrefix(r.URL.Path, "/assets/") {
		file = r.URL.Path
	}

	http.ServeFile(w, r, filepath.Join(CONFIG.WebDir, file))
}

func main() {
	var configPath string
	flag.StringVar(&configPath, "config", "", "Path to config file (required).")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, `usage: cserver [OPTION...]
Start HTTP server, serving a search and view interface of a source tree.`)
		flag.PrintDefaults()
	}
	flag.Parse()

	config, err := config.ParseConfig(configPath)
	if err != nil {
		log.Fatal("could not parse config file: %w", err)
	}

	CONFIG = config
	indexfileInfo, err := os.Stat(CONFIG.IndexPath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Fatal("No such index file: " + CONFIG.IndexPath)
		} else {
			log.Fatal("Failed to stat file: " + CONFIG.IndexPath)
		}
	}
	if !indexfileInfo.Mode().IsRegular() {
		log.Fatal("IndexPath file points to a directory: " + CONFIG.IndexPath)
	}

	sFileInfo, err := os.Stat(filepath.Join(CONFIG.WebDir, "static"))
	if err != nil || !sFileInfo.IsDir() {
		log.Fatal("No 'static' directory under webdir: " + CONFIG.WebDir)
	}
	if err := readManifest(CONFIG.ManifestPath); err != nil {
		log.Fatal("Failed to read manifest: " + err.Error())
	}

	http.HandleFunc("/", staticHandler)
	http.HandleFunc("/rest/file", RestFileHandler)
	http.HandleFunc("/rest/search", RestSearchHandler)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", CONFIG.Port), nil); err != nil {
		log.Fatal("ListenAndServe failed: ", err)
	}
	fmt.Println("ListenAndServe returned, exiting process!")
}
