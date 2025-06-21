package main

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/freva/codesearch/index"
	"github.com/freva/codesearch/internal/config"
)

// UpdateIndices update file indexes and the main code search index.
func UpdateIndices(config *config.Config, verbose bool) error {
	start := time.Now()
	const maxLines = 128
	var lineCounter int
	var currentFile *os.File
	var err error

	fileListsPath := filepath.Join(config.FileListsDir)
	if err := os.RemoveAll(fileListsPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove old file lists directory '%s': %w", fileListsPath, err)
	}
	if err := os.MkdirAll(fileListsPath, 0755); err != nil {
		return fmt.Errorf("failed to create file lists directory '%s': %w", fileListsPath, err)
	}

	codeIndex := index.Create(config.CodeIndexPath + "~")
	codeIndex.LogSkip = verbose
	codeIndex.AddRoots([]index.Path{index.MakePath(config.CodeDir)})
	fileIndex := index.Create(config.FileIndexPath + "~")
	fileIndex.AddRoots([]index.Path{index.MakePath(fileListsPath)})
	fileIndex.LogSkip = verbose

	writeToIndex := func() error {
		if currentFile == nil {
			return nil
		}
		name := currentFile.Name()
		currentFile.Close()
		return fileIndex.AddFile(name)
	}

	for path := range walkFiles(config.CodeDir) {
		if err := codeIndex.AddFile(path); err != nil {
			return fmt.Errorf("failed to add file %s to index: %w", path, err)
		}

		if lineCounter%maxLines == 0 {
			if err := writeToIndex(); err != nil {
				return fmt.Errorf("failed to add file to file index: %w", err)
			}
			fileIndexPath := filepath.Join(fileListsPath, fmt.Sprintf("%0*x", 5, lineCounter/maxLines))
			currentFile, err = os.Create(fileIndexPath)
			if err != nil {
				return fmt.Errorf("failed to create file index file: %w", err)
			}
		}
		lineCounter++

		_, err = fmt.Fprintln(currentFile, strings.TrimPrefix(path, config.CodeDir+"/"))
		if err != nil {
			return err
		}
	}

	if err := writeToIndex(); err != nil {
		return fmt.Errorf("failed to add file to file index: %w", err)
	}

	codeIndex.Flush()
	fileIndex.Flush()

	if err := os.Rename(config.CodeIndexPath+"~", config.CodeIndexPath); err != nil {
		return fmt.Errorf("failed to rename code index file: %w", err)
	}
	if err := os.Rename(config.FileIndexPath+"~", config.FileIndexPath); err != nil {
		return fmt.Errorf("failed to rename file index file: %w", err)
	}

	log.Printf("Indexed %d paths in %s.\n", lineCounter, time.Since(start).Round(10*time.Millisecond))
	return nil
}

func walkFiles(root string) <-chan string {
	paths := make(chan string)

	go func() {
		defer close(paths)

		err := filepath.Walk(root, func(path string, info fs.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if _, elem := filepath.Split(path); elem != "" {
				if elem == ".git" || elem[0] == '#' || elem[0] == '~' || elem[len(elem)-1] == '~' {
					if info.IsDir() {
						return filepath.SkipDir
					}
					return nil
				}
			}
			if info != nil && info.Mode()&os.ModeType == 0 {
				paths <- path
			}
			return nil
		})

		if err != nil {
			fmt.Printf("error walking the path %q: %v\n", root, err)
		}
	}()

	return paths
}
