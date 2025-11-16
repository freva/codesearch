import { useSearchContext } from '../pages/store';
import type { ReactNode } from 'react';
import { backendUrl } from '../libs/fetcher.ts';

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
  const result = useSearchContext(
    (ctx) => ctx.fileResult?.result ?? ctx.searchResult?.result,
  );

  if (!result) return null;

  const text =
    'files' in result
      ? `${result.hits} matches${result.truncated ? ' (truncated)' : ''} in ${result.files.length} files${result.matchedFiles > result.files.length ? ` (${result.matchedFiles} matched)` : ''}`
      : result.matches.length > 0
        ? `${result.matches.length} matches`
        : '';
  return (
    <footer style={{ marginTop: 'auto', width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#ddd',
          margin: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <kbd
            style={{
              padding: '2px 6px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              background: '#f9f9f9',
              fontFamily: 'monospace',
            }}
          >
            ?
          </kbd>
          <span>toggle help</span>
        </div>
        <span>{text}</span>
        <span>
          <a
            href={`${backendUrl()}/rest/manifest`}
            target="_blank"
            rel="noopener noreferrer"
          >
            repositories
          </a>
          {` indexed at ${formatDate(new Date(result.updatedAt))}`}
        </span>
      </div>
    </footer>
  );
}
