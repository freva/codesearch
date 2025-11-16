import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CodeHighlight } from './code-highlight';
import type { LineMatch } from '../store';
import { useSearchContext } from '../store';

function countLines(str: string): number {
  let count = 1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') count++;
  }
  return count;
}

function FileContent({
  code,
  path,
  ranges,
}: {
  code: string;
  path: string;
  ranges: LineMatch[];
}): ReactNode {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash.length === 0) return;
    const fragment = hash.substring(1);

    (async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const element = document.getElementById(fragment);
        if (element) {
          for (const elem of document.getElementsByClassName('line highlight'))
            elem.classList.remove('highlight');
          element.classList.add('highlight');
          element.scrollIntoView({ block: 'center' });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100)); // thisisfine.jpg
      }
    })();
  }, [hash]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '0.5rem',
        fontFamily: 'monospace',
        border: '1px solid #000',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'right',
          paddingLeft: '1rem',
        }}
      >
        {Array.from({ length: countLines(code) })
          .map((_, i) => i + 1)
          .map((i) => (
            <Link to={{ hash: `#L${i}` }} key={i}>
              {i}.
            </Link>
          ))}
      </div>
      <CodeHighlight {...{ code, ranges, path }} />
    </div>
  );
}

export function File(): ReactNode {
  const resultState = useSearchContext((ctx) => ctx.fileResult);
  if (resultState == null) return null;

  const { loading, error, result } = resultState;
  if (loading) return <div className="loader">Loading...</div>;
  if (error)
    return (
      <div className="alert alert-error">
        <strong>{error.message}</strong>
      </div>
    );

  const parts = `${result!.directory}/${result!.path}`.split('/');
  return (
    <div className="container">
      <div className="breadcrumbs text-lg my-4">
        {parts.map((name, i, arr) => (
          <span key={`${i}-${name}`} style={{ display: 'inline' }}>
            {i > 0 && (
              <span style={{ margin: '0 0.5em', color: '#888' }}>/</span>
            )}
            {i === arr.length - 1 ? (
              <span>{name}</span>
            ) : (
              <Link to={'/file/' + arr.slice(0, i + 1).join('/')}>{name}</Link>
            )}
          </span>
        ))}
      </div>
      <FileContent
        code={result!.content}
        path={result!.path}
        ranges={result!.matches}
      />
    </div>
  );
}
