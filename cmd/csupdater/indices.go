package main

import (
	"bufio"
	"bytes"
	"fmt"
	"go/build"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/hakonhall/codesearch/internal/config"
)

// UpdateIndices update file indexes and the main code search index.
func UpdateIndices(config *config.Config) error {
	cindexBinPath, err := findExecutableInGOPATHs("cindex")
	if err != nil {
		return err
	}

	err = updateFileIndex(config, cindexBinPath)
	if err != nil {
		return fmt.Errorf("failed to update file index: %w", err)
	}

	err = updateMainIndex(config, cindexBinPath)
	if err != nil {
		return fmt.Errorf("failed to update main index: %w", err)
	}

	return nil
}

// updateFileIndex generates a list of all files and updates the file index if changes are detected.
func updateFileIndex(config *config.Config, cindexBinPath string) error {
	filelistPath := filepath.Join(config.WorkDir, "filelist")
	filelistNewPath := filelistPath + ".new"

	if err := generateFilelist(config.CodeDir, filelistNewPath); err != nil {
		return fmt.Errorf("could not generate new file list: %w", err)
	}

	areSame, err := compareFiles(filelistPath, filelistNewPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("could not compare file lists: %w", err)
	}
	if areSame {
		os.Remove(filelistNewPath)
		return nil
	}

	filelistsDir := filepath.Join(config.WorkDir, "filelists")
	filelistsDirNew := filelistsDir + ".new"
	if err := fillFilelists(filelistNewPath, filelistsDirNew); err != nil {
		return fmt.Errorf("could not create sharded file lists: %w", err)
	}

	if err := atomicSwapFilelists(filelistsDir+".old", filelistsDir, filelistsDirNew); err != nil {
		return fmt.Errorf("could not swap file list directories: %w", err)
	}

	fileIndexPathNew := config.FileIndexPath + ".new"
	cmd := exec.Command(cindexBinPath, "-index", fileIndexPathNew, filelistsDir)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cindex failed: %w\nOutput: %s", err, string(output))
	}

	if err := os.Rename(fileIndexPathNew, config.FileIndexPath); err != nil {
		return err
	}
	if err := os.Rename(filelistNewPath, filelistPath); err != nil {
		return err
	}

	return nil
}

func updateMainIndex(config *config.Config, cindexBinPath string) error {
	log.Println("Updating main code search index...")
	indexNewPath := config.IndexPath + ".new"

	os.Remove(indexNewPath)

	entries, err := os.ReadDir(config.CodeDir)
	if err != nil {
		return fmt.Errorf("could not list code directory: %w", err)
	}

	args := []string{"-index", indexNewPath}
	for _, entry := range entries {
		args = append(args, filepath.Join(config.CodeDir, entry.Name()))
	}

	cmd := exec.Command(cindexBinPath, args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("cindex command failed on code directory: %w\nOutput: %s", err, string(output))
	}

	if err := os.Rename(indexNewPath, config.IndexPath); err != nil {
		return fmt.Errorf("could not move new index into place: %w", err)
	}

	return nil
}

// generateFilelist walks the code directory and writes all file paths to a new list file.
func generateFilelist(codeDir, targetFile string) error {
	outFile, err := os.Create(targetFile)
	if err != nil {
		return err
	}
	defer outFile.Close()

	writer := bufio.NewWriter(outFile)
	defer writer.Flush()

	return filepath.WalkDir(codeDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// Skip directories, do not descend into .git directories
		if d.IsDir() {
			if d.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		// Write the file path relative to the code directory root
		relPath, err := filepath.Rel(codeDir, path)
		if err != nil {
			return err
		}
		_, err = writer.WriteString(relPath + "\n")
		return err
	})
}

// compareFiles checks if two files have identical content.
func compareFiles(path1, path2 string) (bool, error) {
	f1, err := os.ReadFile(path1)
	if err != nil {
		return false, err
	}
	f2, err := os.ReadFile(path2)
	if err != nil {
		return false, err
	}
	return bytes.Equal(f1, f2), nil
}

func fillFilelists(masterListPath, targetDir string) error {
	if err := os.RemoveAll(targetDir); err != nil {
		return err
	}
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return err
	}

	file, err := os.Open(masterListPath)
	if err != nil {
		return err
	}
	defer file.Close()

	const maxLines = 128
	var dirIndex, fileIndex, lineIndex int
	var currentFile *os.File

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if lineIndex == 0 || currentFile == nil { // Need to open a new file
			if currentFile != nil {
				currentFile.Close()
			}

			if fileIndex <= dirIndex {
				if fileIndex == 0 {
					fileIndex = dirIndex + 1
					dirIndex = 0
				} else {
					fileIndex--
				}
			} else {
				dirIndex++
			}

			subDir := filepath.Join(targetDir, fmt.Sprintf("%x", dirIndex))
			if err := os.MkdirAll(subDir, 0755); err != nil {
				return err
			}

			filePath := filepath.Join(subDir, fmt.Sprintf("%x", fileIndex))
			currentFile, err = os.Create(filePath)
			if err != nil {
				return err
			}
		}

		if _, err := fmt.Fprintln(currentFile, scanner.Text()); err != nil {
			return err
		}
		lineIndex = (lineIndex + 1) % maxLines
	}
	if currentFile != nil {
		currentFile.Close()
	}

	return scanner.Err()
}

func atomicSwapFilelists(oldPath, currentPath, newPath string) error {
	if err := os.RemoveAll(oldPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove old filelists directory: %w", err)
	}

	if _, err := os.Stat(currentPath); err == nil {
		if err := os.Rename(currentPath, oldPath); err != nil {
			return fmt.Errorf("failed to rename current filelists directory: %w", err)
		}
	}

	if err := os.Rename(newPath, currentPath); err != nil {
		return fmt.Errorf("failed to rename new filelists directory: %w", err)
	}

	return nil
}

func findExecutableInGOPATHs(execName string) (string, error) {
	gopaths := strings.Split(build.Default.GOPATH, string(os.PathListSeparator))

	for _, gopath := range gopaths {
		if gopath == "" {
			continue
		}

		execPath := filepath.Join(gopath, "bin", execName)
		info, err := os.Stat(execPath)
		if err == nil {
			if info.Mode().IsRegular() {
				return execPath, nil
			}
		} else if !os.IsNotExist(err) {
			fmt.Printf("Warning: Error checking %s: %v\n", execPath, err)
		}
	}

	return "", fmt.Errorf("executable '%s' not found in any configured GOPATH: %s", execName, gopaths)
}
