// Copyright 2011 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/hakonhall/codesearch/internal/config"
)

var (
	CodeDir       string
	WebDir        string
	ManifestPath  string
	CodeIndexPath string
	FileIndexPath string
)

func staticHandler(w http.ResponseWriter, r *http.Request) {
	file := "index.html"
	if strings.HasPrefix(r.URL.Path, "/static/") || strings.HasPrefix(r.URL.Path, "/assets/") {
		file = r.URL.Path
	}

	http.ServeFile(w, r, filepath.Join(WebDir, file))
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

	cfg, err := config.ReadConfig(configPath)
	if err != nil {
		log.Fatal("could not parse config file: %w", err)
	}

	CodeDir = cfg.CodeDir
	WebDir = cfg.WebDir
	ManifestPath = cfg.ManifestPath
	CodeIndexPath = cfg.CodeIndexPath
	FileIndexPath = cfg.FileIndexPath
	if _, err := os.Stat(CodeIndexPath); err != nil {
		log.Fatal("Failed to stat code index file: " + CodeIndexPath)
	}

	http.HandleFunc("/", staticHandler)
	http.HandleFunc("/rest/file", RestFileHandler)
	http.HandleFunc("/rest/search", RestSearchHandler)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), nil); err != nil {
		log.Fatal("ListenAndServe failed: ", err)
	}
	fmt.Println("ListenAndServe returned, exiting process!")
}
