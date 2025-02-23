package regexp

import (
	"bufio"
	"fmt"
	"github.com/freva/codesearch/index"
	"io"
	"iter"
	"os"
)

type LineMatch struct {
	Lineno int
	Line   string
	Match  bool
}

func FindMatches(name index.Path, regexp *Regexp, beforeLines int, afterLines int) iter.Seq[LineMatch] {
	return func(yield func(match LineMatch) bool) {
		file, err := os.Open(name.String())
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to open file: %w", err)
			return
		}
		defer file.Close()

		reader := bufio.NewReader(file)
		var (
			prevLines       = NewFixedSizeQueue[string](beforeLines)
			lineno          = 1
			printNextNLines = -1
			eof             = false
		)

		for !eof {
			line, err := reader.ReadString('\n')
			if err == io.EOF {
				eof = true
			} else if err != nil {
				fmt.Fprintf(os.Stderr, "failed to read line: %w", err)
				return
			}

			m1 := regexp.MatchString(line, true, true)
			if m1 >= 0 {
				for i := prevLines.Size(); i > 0; i-- {
					if !yield(LineMatch{Lineno: lineno - i, Line: prevLines.Dequeue(), Match: false}) {
						return
					}
				}
				printNextNLines = afterLines
			}

			if printNextNLines >= 0 {
				if !yield(LineMatch{Lineno: lineno, Line: line, Match: printNextNLines == afterLines}) {
					return
				}
				printNextNLines--
			} else {
				prevLines.Enqueue(line)
			}
			lineno++

		}
	}
}
