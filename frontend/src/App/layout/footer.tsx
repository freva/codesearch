import { useSearchContext } from '../pages/store';
import type { ReactNode } from 'react';
import { backendUrl } from '../libs/fetcher';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function Footer(): ReactNode {
  const result = useSearchContext((ctx) => ctx.fileResult?.result ?? ctx.searchResult?.result);

  if (!result) return null;

  const text =
    'files' in result
      ? `${result.hits} matches${result.truncated ? ' (truncated)' : ''} in ${result.files.length} files${result.matchedFiles > result.files.length ? ` (${result.matchedFiles} matched)` : ''}`
      : result.matches.length > 0
        ? `${result.matches.length} matches`
        : '';
  return (
    <footer className="mt-auto">
      <div className="h-px bg-gray-300" />
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono">?</kbd>
          <span className="text-gray-600">toggle help</span>
        </div>
        <span className="text-gray-700">{text}</span>
        <span className="text-gray-700">
          <a
            href={`${backendUrl()}/rest/manifest`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            repositories
          </a>
          {` indexed at ${formatDate(new Date(result.updatedAt))}`}
        </span>
      </div>
    </footer>
  );
}
