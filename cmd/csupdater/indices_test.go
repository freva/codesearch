package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestWalkFiles(t *testing.T) {
	tmp := t.TempDir()
	os.MkdirAll(filepath.Join(tmp, "some/nested/dir"), 0755)
	os.WriteFile(filepath.Join(tmp, "some/nested/dir/file.json"), []byte(""), 0644)
	os.WriteFile(filepath.Join(tmp, "some/nested/dir/file.json~"), []byte(""), 0644)
	os.WriteFile(filepath.Join(tmp, "some/nested/.gitignore"), []byte(""), 0644)
	os.WriteFile(filepath.Join(tmp, "a.txt"), []byte(""), 0644)
	os.WriteFile(filepath.Join(tmp, "#skip.txt"), []byte(""), 0644)
	os.Mkdir(filepath.Join(tmp, ".git"), 0755)
	os.WriteFile(filepath.Join(tmp, ".git", "x"), []byte(""), 0644)

	var got []string
	for f := range walkFiles(tmp) {
		got = append(got, strings.TrimPrefix(f, tmp+"/"))
	}
	expected := []string{"a.txt", "some/nested/.gitignore", "some/nested/dir/file.json"}
	if !reflect.DeepEqual(got, expected) {
		t.Errorf("walkFiles returned %v, expected %v", got, expected)
	}
}
