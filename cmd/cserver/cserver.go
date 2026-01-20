// Copyright 2011 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/freva/codesearch/internal/config"
)

var (
	CodeDir       string
	ManifestPath  string
	CodeIndexPath string
	FileIndexPath string
)

//go:embed static
var embedFS embed.FS

func manifestHandler(w http.ResponseWriter, r *http.Request) {
	handleError(w, func() error {
		manifest, err := config.ReadManifest(ManifestPath)
		if err != nil {
			return fmt.Errorf("Failed to read manifest: %w", err)
		}

		w.Header().Set("Content-Type", "application/json")
		return json.NewEncoder(w).Encode(manifest)
	})
}

func main() {
	var configPath string
	flag.StringVar(&configPath, "config", "", "Path to config file (required).")

	flag.Usage = func() {
		_, _ = fmt.Fprintf(os.Stderr, `usage: cserver [OPTION...]
Start HTTP server, serving a search and view interface of a source tree.`)
		flag.PrintDefaults()
	}
	flag.Parse()

	cfg, err := config.ReadConfig(configPath)
	if err != nil {
		log.Fatal("could not parse config file: %w", err)
	}

	CodeDir = cfg.CodeDir
	ManifestPath = cfg.ManifestPath
	CodeIndexPath = cfg.CodeIndexPath
	FileIndexPath = cfg.FileIndexPath
	if _, err := os.Stat(CodeIndexPath); err != nil {
		log.Fatal("Failed to stat code index file: " + CodeIndexPath)
	}

	staticFS, err := fs.Sub(embedFS, "static")
	if err != nil {
		log.Fatal("Failed to resolve embedded static directory: %w", err)
	}

	fileServer := http.FileServer(http.FS(staticFS))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/assets/") {
			r.URL.Path = "/"
		}
		fileServer.ServeHTTP(w, r)
	})

	http.HandleFunc("/rest/manifest", manifestHandler)
	http.HandleFunc("/rest/file", RestFileHandler)
	http.HandleFunc("/rest/search", RestSearchHandler)
	http.HandleFunc("/rest/list", RestListHandler)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), nil); err != nil {
		log.Fatal("ListenAndServe failed: ", err)
	}
	fmt.Println("ListenAndServe returned, exiting process!")
}
