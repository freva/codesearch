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
    <div className="rounded-lg overflow-hidden border border-gray-300 flex flex-row font-mono">
      <div className="flex flex-col bg-gray-50 border-r border-gray-200 select-none">
        {Array.from({ length: countLines(code) })
          .map((_, i) => i + 1)
          .map((i) => (
            <Link
              to={{ hash: `#L${i}` }}
              key={i}
              className="w-12 text-gray-500 hover:text-blue-600 px-2 flex items-center justify-end"
            >
              {i}
            </Link>
          ))}
      </div>
      <div className="flex-1 overflow-x-auto">
        <CodeHighlight {...{ code, ranges, path }} />
      </div>
    </div>
  );
}

export function File(): ReactNode {
  const resultState = useSearchContext((ctx) => ctx.fileResult);
  if (resultState == null) return null;

  const { loading, error, result } = resultState;
  if (loading) return <div className="text-center my-8">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded m-4">
        <strong>Error:</strong> {error.message}
      </div>
    );

  const parts = `${result!.directory}/${result!.path}`.split('/');
  return (
    <div className="px-2 py-1 w-full max-w-none mx-auto">
      <div className="flex items-center text-sm text-gray-600 my-1 flex-wrap gap-1">
        {parts.map((name, i, arr) => (
          <span key={`${i}-${name}`} className="inline">
            {i > 0 ? <span className="mx-1 text-gray-400">/</span> : null}
            {i === arr.length - 1 ? (
              <span className="font-medium text-gray-900">{name}</span>
            ) : (
              <Link
                to={'/file/' + arr.slice(0, i + 1).join('/')}
                className="text-blue-600 hover:text-blue-800"
              >
                {name}
              </Link>
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
