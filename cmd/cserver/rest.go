package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	stdregexp "regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/freva/codesearch/index"
	"github.com/freva/codesearch/regexp"
)

var escapedChars = map[rune]string{
	'"':  "\\\"",
	'\\': "\\\\",
	'\n': "\\n",
	'\r': "\\r",
	'\t': "\\t",
	'\b': "\\b",
	'\f': "\\f",
}

func removePathPrefix(path index.Path) string {
	return strings.TrimPrefix(path.String(), CONFIG.CodeDir)
}

func escapeJsonString(str string) string {
	var result string
	for _, r := range str {
		if escaped, ok := escapedChars[r]; ok {
			result += escaped
		} else if unicode.IsControl(r) {
			result += fmt.Sprintf("\\u%04X", r)
		} else {
			result += string(r)
		}
	}
	return result
}

func indexUpdatedAt() time.Time {
	stat, err := os.Stat(CONFIG.IndexPath)
	if err != nil {
		return time.Unix(0, 0)
	}
	return stat.ModTime()
}

func setHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
}

func handleError(w http.ResponseWriter, f func() error) {
	if err := f(); err != nil {
		if len(w.Header()) == 0 {
			setHeaders(w)
			w.WriteHeader(http.StatusBadRequest)
			response := fmt.Sprintf("{\"message\": \"%s\"}", escapeJsonString(err.Error()))
			if _, wErr := w.Write([]byte(response)); wErr != nil {
				log.Printf("Failed to write error response: %v. Original error: %v", wErr, err)
			}
		} else {
			log.Println("Error:", err)
		}
	}
}

func maybeWriteComma(w http.ResponseWriter, shouldWriteComma bool) error {
	var err error
	if shouldWriteComma {
		_, err = w.Write([]byte(","))
	}
	return err
}

func writeJsonFileHeader(w http.ResponseWriter, path string, pathRegex *stdregexp.Regexp) error {
	var file = resolvePath(path)
	if file == nil {
		return fmt.Errorf("Failed to resolve path %s", path)
	}

	if _, err := w.Write([]byte(fmt.Sprintf("{\"path\":\"%s\",\"directory\":\"%s\",\"repository\":\"%s/%s/%s\",\"branch\":\"%s\"",
		escapeJsonString(file.Relpath), file.Repository.RepoDir(), file.ResolveServer().WebURL, file.Repository.Owner, file.Repository.Name, file.Repository.Branch))); err != nil {
		return err
	}

	if pathRegex != nil {
		matches := pathRegex.FindStringSubmatchIndex(path)
		rangeStr := fmt.Sprintf(",\"range\":[%d,%d]", matches[0], matches[1])
		if _, err := w.Write([]byte(rangeStr)); err != nil {
			return err
		}
	}
	return nil
}

func search(w http.ResponseWriter, query string, fileFilter string, excludeFileFilter string, maxHits int, ignoreCase bool, beforeLines int, afterLines int) error {
	// (?m) => ^ and $ match beginning and end of line, respectively
	queryPattern := "(?m)" + query
	if ignoreCase {
		queryPattern = "(?i)" + queryPattern
	}
	queryRe, err := regexp.Compile(queryPattern)
	if err != nil {
		return fmt.Errorf("Bad query regular expression: %w", err)
	}
	queryStdRe, err := stdregexp.Compile(queryPattern)
	if err != nil {
		log.Print(err)
	}

	var fileRe *regexp.Regexp
	var fileStdRe *stdregexp.Regexp
	if fileFilter != "" {
		filePattern := fileFilter
		if ignoreCase {
			filePattern = "(?i)" + filePattern
		}

		fileRe, err = regexp.Compile(filePattern)
		if err != nil {
			return fmt.Errorf("Bad file regular expression: %w", err)
		}

		fileStdRe, err = stdregexp.Compile(filePattern)
		if err != nil {
			log.Print(err)
		}
	}

	var xFileRe *regexp.Regexp
	if excludeFileFilter != "" {
		excludeFilePattern := excludeFileFilter
		if ignoreCase {
			excludeFilePattern = "(?i)" + excludeFilePattern
		}

		xFileRe, err = regexp.Compile(excludeFilePattern)
		if err != nil {
			log.Print(err)
			return fmt.Errorf("Bad exclude file regular expression: %w", err)
		}
	}

	q := index.RegexpQuery(queryRe.Syntax)
	ix := index.Open(CONFIG.IndexPath)
	ix.Verbose = false
	var post = ix.PostingQuery(q)

	truncated := false
	numHits := 0

	setHeaders(w)
	if _, err := w.Write([]byte("{\"files\":[")); err != nil {
		return err
	}

	for _, fileId := range post {
		if numHits >= maxHits {
			truncated = true
			break
		}

		fullPath := ix.Name(fileId)
		path := removePathPrefix(fullPath)

		if fileRe != nil {
			// Retain only those files matching the file pattern.
			if fileRe.MatchString(path, true, true) < 0 {
				continue
			}
		}

		if xFileRe != nil {
			// Skip files matching the exclude file pattern.
			if xFileRe.MatchString(path, true, true) >= 0 {
				continue
			}
		}

		isFirstHit := true
		for hit := range regexp.FindMatches(fullPath, queryRe, beforeLines, afterLines) {
			if isFirstHit {
				if err := maybeWriteComma(w, numHits > 0); err != nil {
					return err
				}
				if err := writeJsonFileHeader(w, path, fileStdRe); err != nil {
					return err
				}
				if _, err := w.Write([]byte(",\"lines\":[")); err != nil {
					return err
				}
				isFirstHit = false
			} else {
				if err := maybeWriteComma(w, true); err != nil {
					return err
				}
			}

			escapedLine := escapeJsonString(strings.TrimSuffix(hit.Line, "\n"))
			if _, err := w.Write([]byte(fmt.Sprintf("{\"line\":\"%s\"", escapedLine))); err != nil {
				return err
			}

			lineMeta := fmt.Sprintf(",\"number\":%d", hit.Lineno)
			if hit.Match {
				matches := queryStdRe.FindStringSubmatchIndex(hit.Line)
				if matches != nil {
					lineMeta += fmt.Sprintf(",\"range\":[%d,%d]", matches[0], matches[1])
				}

				numHits += 1
			}
			if _, err := w.Write([]byte(lineMeta + "}")); err != nil {
				return err
			}

			if numHits >= maxHits+20 {
				truncated = true
				break
			}
		}

		if !isFirstHit {
			if _, err := w.Write([]byte("]}")); err != nil {
				return err
			}
		}
	}

	updatedAt := indexUpdatedAt()
	_, err = w.Write([]byte(fmt.Sprintf("],\"matchedFiles\":%d,\"updatedAt\":%d,\"truncated\":%t}", len(post), updatedAt.Unix(), truncated)))
	return err
}

func searchFile(w http.ResponseWriter, fileFilter string, excludeFileFilter string, maxHits int, ignoreCase bool) error {
	filePattern := "(?m)" + fileFilter
	if ignoreCase {
		filePattern = "(?i)" + filePattern
	}
	fileRe, err := regexp.Compile(filePattern)
	if err != nil {
		return fmt.Errorf("Bad file regular expression: %w", err)
	}

	// pattern includes e.g. (?i), which is correct even for plain "regexp" package.
	fileStdRe, err := stdregexp.Compile(filePattern)
	if err != nil {
		log.Print(err)
		fileStdRe = nil
	}

	var xFileRe *regexp.Regexp
	if excludeFileFilter != "" {
		xFilePattern := excludeFileFilter
		if ignoreCase {
			xFilePattern = "(?i)" + xFilePattern
		}
		xFileRe, err = regexp.Compile(xFilePattern)
		if err != nil {
			return fmt.Errorf("Bad exclude file regular expression: %w", err)
		}
	}

	idx := index.Open(CONFIG.FileIndexPath)
	idx.Verbose = false
	query := index.RegexpQuery(fileRe.Syntax)
	var post = idx.PostingQuery(query)

	numHits := 0
	truncated := false

	setHeaders(w)
	if _, err := w.Write([]byte("{\"files\":[")); err != nil {
		return err
	}

	for _, fileId := range post {
		if numHits >= maxHits {
			truncated = true
			break
		}

		manifest := idx.Name(fileId)
		grep := regexp.Grep{Regexp: fileRe, Stderr: os.Stderr}
		// This is no better than just looping through the lines
		// of the files and matching (AFAIK), so there's only a
		// benefit if we don't traverse through all files: Split
		// up the list of paths in many.  Too many => I/O bound.
		grep.File2(manifest.String())

		for _, hit := range grep.MatchedLines {
			path := hit.Line
			if len(path) > 0 && path[len(path)-1] == '\n' {
				path = path[:len(path)-1]
			}

			if xFileRe != nil && xFileRe.MatchString(path, true, true) >= 0 {
				continue
			}

			if err := maybeWriteComma(w, numHits > 0); err != nil {
				return err
			}
			if err := writeJsonFileHeader(w, path, fileStdRe); err != nil {
				return err
			}
			if _, err := w.Write([]byte("}")); err != nil {
				return err
			}

			numHits += 1
			if numHits >= maxHits+10 {
				truncated = true
				break
			}
		}
	}

	_, err = w.Write([]byte(fmt.Sprintf("],\"hits\":%d,\"truncated\":%t}", numHits, truncated)))
	return err
}

func RestSearchHandler(w http.ResponseWriter, r *http.Request) {
	handleError(w, func() error {
		if err := r.ParseForm(); err != nil {
			return err
		}

		query := r.Form.Get("q")
		fileFilter := r.Form.Get("f")
		excludeFileFilter := r.Form.Get("xf")
		ignoreCase := r.Form.Get("i") != ""

		parseNumber := func(param string, defaultValue int) (int, error) {
			paramValue := r.Form.Get(param)
			if paramValue == "" {
				return defaultValue, nil
			}
			value, err := strconv.Atoi(paramValue)
			if err != nil || value < 0 {
				return -1, fmt.Errorf("Invalid non-negative number for parameter '%s', got '%s'", param, paramValue)
			}
			return value, nil
		}
		before, err := parseNumber("b", 0)
		if err != nil {
			return err
		}
		after, err := parseNumber("a", 0)
		if err != nil {
			return err
		}
		maxHits, err := parseNumber("n", 100)
		if err != nil {
			return err
		}

		if query == "" && fileFilter == "" {
			return fmt.Errorf("No query or file filter")
		} else if query == "" {
			return searchFile(w, fileFilter, excludeFileFilter, maxHits, ignoreCase)
		} else {
			return search(w, query, fileFilter, excludeFileFilter, maxHits, ignoreCase, before, after)
		}
	})
}

type MatchedEntry struct {
	Line  int
	Start int
	End   int
}

func restShowFile(w http.ResponseWriter, path string, query string, ignoreCase bool) error {
	pattern := query
	if ignoreCase {
		pattern = "(?i)" + pattern
	}
	re, err := stdregexp.Compile(pattern)
	if err != nil {
		return err
	}

	file, err := os.Open(filepath.Join(CONFIG.CodeDir, path))
	if err != nil {
		return err
	}
	defer file.Close()

	setHeaders(w)
	if err := writeJsonFileHeader(w, path, nil); err != nil {
		return err
	}
	if _, err := w.Write([]byte(",\"content\":\"")); err != nil {
		return err
	}

	i := 1
	var matchedEntries []MatchedEntry
	scanner := bufio.NewScanner(file)
	// Got this error with a 68kB line: bufio.Scanner: token too long
	const maxCapacity = 1024 * 1024 // 1 MB
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)
	for scanner.Scan() {
		line := scanner.Text()
		if _, err := w.Write([]byte(escapeJsonString(line + "\n"))); err != nil {
			return err
		}

		if query != "" {
			matches := re.FindStringSubmatchIndex(line)
			if matches != nil {
				matchedEntries = append(matchedEntries, MatchedEntry{
					Line:  i,
					Start: matches[0],
					End:   matches[1],
				})
			}
		}
		i = i + 1
	}

	if _, err = w.Write([]byte("\",\"matches\":[")); err != nil {
		return err
	}
	for i, entry := range matchedEntries {
		if err := maybeWriteComma(w, i > 0); err != nil {
			return err
		}
		entryStr := fmt.Sprintf("{\"line\":%d,\"range\":[%d,%d]}", entry.Line, entry.Start, entry.End)
		if _, err := w.Write([]byte(entryStr)); err != nil {
			return err
		}
	}

	if _, err = w.Write([]byte("]}")); err != nil {
		return err
	}

	return scanner.Err()
}

func RestFileHandler(w http.ResponseWriter, request *http.Request) {
	handleError(w, func() error {
		if err := request.ParseForm(); err != nil {
			return err
		}

		path := request.Form.Get("p")
		query := request.Form.Get("q")
		ignoreCase := request.Form.Get("i") != ""

		if strings.Contains(path, "..") {
			return fmt.Errorf("Path cannot contain \"..\"")
		}

		return restShowFile(w, path, query, ignoreCase)
	})
}
