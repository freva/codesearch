import { type ReactNode, useEffect, useState } from 'react';
import Prism from 'prismjs';
import type { Range } from '../store';

// Import Prism languages
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cmake';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-hcl';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';

const fileExtensionToLanguage = Object.fromEntries(
  Object.entries({
    bash: ['sh', 'bash'],
    c: ['c'],
    cpp: ['cpp', 'cppm', 'hpp', 'h'],
    cmake: ['cmake'],
    css: ['css'],
    docker: ['dockerfile'],
    go: ['go'],
    hcl: ['hcl', 'tf'],
    java: ['java'],
    javascript: ['jsx'],
    json: ['json', 'jsonc', 'jsonl'],
    jsx: ['jsx'],
    makefile: ['makefile'],
    markdown: ['md', 'mdx'],
    markup: ['html', 'svg', 'xml'],
    python: ['py'],
    ruby: ['rb'],
    tsx: ['tsx'],
    typescript: ['ts'],
    yaml: ['yaml', 'yml'],
  }).flatMap(([language, extensions]) =>
    extensions.map((ext) => [ext, language]),
  ),
);

function pathToLanguage(extension: string): string {
  const fileIndex = extension.lastIndexOf('/');
  const extensionIndex = extension.lastIndexOf('.');
  const ext = extension
    .substring(Math.max(fileIndex, extensionIndex) + 1)
    .toLocaleLowerCase();
  return fileExtensionToLanguage[ext] ?? 'text';
}

type LineMatch = { line: number; range: Range };
function getHighlightsForLine(
  lineIdx: number,
  ranges: LineMatch[],
): [number, number][] {
  return ranges.filter((r) => r.line - 1 === lineIdx).map((r) => r.range);
}

function renderPrismTokens(
  tokens: Prism.TokenStream,
  highlights: [number, number][],
): ReactNode[] {
  let charIdx = 0;
  let highlightIdx = 0;
  let openHighlight = false;

  function walk(token: Prism.TokenStream): ReactNode[] {
    let nodes: ReactNode[] = [];
    for (const part of Array.isArray(token) ? token : [token]) {
      if (typeof part === 'string') {
        for (let i = 0; i < part.length; ) {
          if (charIdx === highlights[highlightIdx]?.[0]) {
            openHighlight = true;
          } else if (charIdx === highlights[highlightIdx]?.[1]) {
            openHighlight = false;
            highlightIdx++;
          }
          const nextHighlightStart =
            highlights[highlightIdx]?.[0] ?? part.length + charIdx;
          const nextHighlightEnd =
            highlights[highlightIdx]?.[1] ?? part.length + charIdx;
          let chunkEnd = openHighlight
            ? Math.min(nextHighlightEnd - charIdx + i, part.length)
            : Math.min(nextHighlightStart - charIdx + i, part.length);
          let chunk = part.slice(i, chunkEnd);
          if (openHighlight) {
            nodes.push(
              <span className="highlight" key={nodes.length}>
                {chunk}
              </span>,
            );
          } else {
            nodes.push(chunk);
          }
          i += chunk.length;
          charIdx += chunk.length;
        }
      } else if (typeof part === 'object' && part !== null) {
        nodes.push(
          <span
            key={nodes.length}
            className={part.type ? `token ${part.type}` : undefined}
          >
            {walk(part.content)}
          </span>,
        );
      }
    }
    return nodes;
  }
  return walk(tokens);
}

function highlightCodeReact(
  code: string,
  language: string,
  ranges: LineMatch[],
): ReactNode {
  const lines = code.split('\n');
  const prismLang = Prism.languages[language];
  return (
    <pre className={`language-${language}`}>
      <code className={`language-${language}`}>
        {lines.map((line, idx) => {
          const highlights = getHighlightsForLine(idx, ranges);
          const tokens = Prism.tokenize(line, prismLang);
          return (
            <div key={idx} id={`L${idx + 1}`} className="line hover:bg-blue-50">
              {renderPrismTokens(tokens, highlights)}
            </div>
          );
        })}
      </code>
    </pre>
  );
}

export function CodeHighlight({
  code,
  path,
  ranges = [],
}: {
  code: string;
  path: string;
  ranges?: LineMatch[];
}): ReactNode {
  const [content, setContent] = useState<ReactNode>(<pre>{code}</pre>);
  useEffect(() => {
    const language = pathToLanguage(path);
    setContent(highlightCodeReact(code, language, ranges));
  }, [code, path, ranges]);

  return content;
}
