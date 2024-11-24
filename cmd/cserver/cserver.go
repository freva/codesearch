// Copyright 2011 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/hakonhall/codesearch/index"
)

var usageMessage = `usage: cserver [OPTION...]
Start HTTP server, serving a search and view interface of a source tree.

Options:
  -f FIDX     Path to file index made on the paths of SOURCE.*
  -index IDX  Path to index made by cindex on SOURCE. [CSEARCHINDEX]
  -p PORT     Port to listen to. [80]
  -s SOURCE   Path to source directory.*
  -t TSFILE   Path to timestamp file of the last index update.*
  -w STATIC   Path to static files to serve (cmd/server/static/).*
*) Option is required.

WARNING: All files and directories below STATIC and SOURCE are accessible from
the cserver HTTP server.  
`

var INDEX_PATH string

func usage() {
	fmt.Fprintf(os.Stderr, usageMessage)
	os.Exit(2)
}

var (
	fFlag     = flag.String("f", "", "Path to file index (required)")
	indexFlag = flag.String("index", "", "Path to index file [CSEARCHINDEX]")
	pFlag     = flag.Int("p", 80, "Port to listen to [80]")
	sFlag     = flag.String("s", "", "Path to the source tree (required)")
	tFlag     = flag.String("t", "", "Path to the timestamp file of the last index update (required)")
	wFlag     = flag.String("w", "", "Path to static files to serve [cmd/cserver/static/]")
)

type Manifest struct {
	Servers  []Server
	Branches []Branch
}

type Server struct {
	Name string
	Url  string
}

type Branch struct {
	Server string
	Dir    string
	Repo   string
	Branch *string
}

func (s Branch) ResolveServer() Server {
	server, ok := SERVERS[s.Server]
	if !ok {
		log.Print("Failed to find " + s.Server + " in SERVERS")
	}
	return server
}

type File struct {
	Branch  Branch
	Relpath string
}

// Server by server name
var SERVERS map[string]Server

// Branch by dir
var BRANCHES map[string]Branch

func readManifest(path string) {
	manifestFile, e := os.Open(path)
	if e != nil {
		log.Fatal("Failed to open " + path)
	}
	defer manifestFile.Close()
	manifestData, e := ioutil.ReadAll(manifestFile)
	if e != nil {
		log.Fatal("Failed to read " + path)
	}

	var manifest Manifest
	json.Unmarshal(manifestData, &manifest)

	//fmt.Printf("%q\n", manifest)
	SERVERS = make(map[string]Server)
	for _, server := range manifest.Servers {
		SERVERS[server.Name] = server
	}

	BRANCHES = make(map[string]Branch)
	for _, branch := range manifest.Branches {
		BRANCHES["/"+branch.Dir] = branch
	}
}

// path must be relative to the serving directory (sFlag).
func resolvePath(path string) (*File, error) {
	prefix := ""
	suffix := "/" + path
	for {
		var offset = strings.Index(suffix[1:], "/") + 1
		if offset < 1 {
			return nil, fmt.Errorf("Failed to find branch for " + path)
		}
		var name = suffix[:offset]
		if len(name) == 0 {
			return nil, fmt.Errorf("Found empty component for " + path)
		}
		prefix += name
		suffix = suffix[offset:]
		branch, ok := BRANCHES[prefix]
		if ok {
			return &File{Branch: branch, Relpath: suffix}, nil
		}
	}
}

func main() {
	flag.Usage = usage
	flag.Parse()

	if *fFlag == "" {
		log.Fatal("-f is required, see -help for usage")
	}
	fileIndexFileInfo, e := os.Stat(*fFlag)
	if e != nil {
		if os.IsNotExist(e) {
			log.Fatal("No such index file: " + *fFlag)
		} else {
			log.Fatal("Failed to stat file: " + *fFlag)
		}
	}
	if !fileIndexFileInfo.Mode().IsRegular() {
		log.Fatal("Not an index file: " + *fFlag)
	}

	INDEX_PATH = index.File(*indexFlag)
	indexfileInfo, e := os.Stat(INDEX_PATH)
	if e != nil {
		if os.IsNotExist(e) {
			log.Fatal("No such index file: " + INDEX_PATH)
		} else {
			log.Fatal("Failed to stat file: " + INDEX_PATH)
		}
	}
	if !indexfileInfo.Mode().IsRegular() {
		log.Fatal("Index file points to a directory: " + INDEX_PATH)
	}

	if *sFlag == "" {
		log.Fatal("-s is required, see -help for usage")
	}
	if (*sFlag)[len(*sFlag)-1:] != "/" {
		*sFlag += "/"
	}

	if *tFlag == "" {
		log.Fatal("-t is required, see -help for usage")
	}

	if *wFlag == "" {
		log.Fatal("-w is required, see -help for usage")
	}
	sFileInfo, e := os.Stat(*wFlag)
	if e != nil {
		log.Fatal("Failed to open '" + *wFlag + "'")
	}
	if !sFileInfo.IsDir() {
		log.Fatal("Not a directory: " + *wFlag)
	}
	sFileInfo, e = os.Stat(*wFlag + "/static")
	if e != nil || !sFileInfo.IsDir() {
		log.Fatal("Does not look like a path to cmd/cserver/static: " + *wFlag)
	}
	readManifest(*wFlag + "/static/repos.json")

	http.HandleFunc("/", search_handler)
	http.Handle("/static/", http.FileServer(http.Dir(*wFlag)))
	http.HandleFunc("/file/", file_handler)
	http.HandleFunc("/rest/file", RestFileHandler)
	http.HandleFunc("/rest/search", RestSearchHandler)
	http.ListenAndServe(":"+strconv.Itoa(*pFlag), nil)
	fmt.Println("ListenAndServe returned, exiting process!")
}
