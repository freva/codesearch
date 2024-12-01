import { codeToHtml } from 'shiki';
import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';

const fileExtensionToLanguage = Object.fromEntries(
  Object.entries({
    cpp: ['cpp', 'hpp', 'h'],
    java: ['java'],
    css: ['css'],
    xml: ['xml'],
    rb: ['ruby'],
    json: ['json'],
    yml: ['yaml', 'yml'],
    scss: ['scss'],
    js: ['js', 'jsx'],
    py: ['python'],
    ts: ['ts', 'tsx'],
    sh: ['sh'],
    tf: ['terraform'],
    html: ['html'],
    md: ['md', 'readme'],
    dockerfile: ['dockerfile'],
    makefile: ['makefile'],
    diff: ['diff'],
    go: ['go'],
    kt: ['kt'],
  }).flatMap(([language, extensions]) =>
    extensions.map((ext) => [ext, language]),
  ),
);

function pathToLanguage(extension: string): string {
  const fileIndex = extension.lastIndexOf('/');
  const extensionIndex = extension.lastIndexOf('.');
  const ext = extension.substring(Math.max(fileIndex, extensionIndex) + 1);
  return fileExtensionToLanguage[ext] ?? 'text';
}

type LineMatch = { line: number; range: [number, number] };
export function CodeHighlight({
  code,
  path,
  ranges = [],
}: {
  code: string;
  path: string;
  ranges?: LineMatch[];
}): ReactNode {
  const [html, setHtml] = useState<string>();
  useLayoutEffect(() => {
    const language = pathToLanguage(path);
    codeToHtml(code, {
      theme: 'github-light-default',
      lang: language,
      decorations: ranges.map(({ line, range }) => ({
        start: { line: line - 1, character: range[0] },
        end: { line: line - 1, character: range[1] },
        properties: { class: 'highlight' },
      })),
      transformers: [
        {
          line(node, line): void {
            node.properties.id = `L${line}`;
          },
        },
      ],
    }).then(setHtml);
  }, [code, path]);

  if (!html) return <pre>{code}</pre>;
  return (
    <div style={{ flexGrow: 1 }} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
