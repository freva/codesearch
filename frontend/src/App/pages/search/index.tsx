import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { CodeHighlight } from '../file/code-highlight';
import type { File, Line } from '../store';
import { useSearchContext } from '../store';

function CodeLine({
  line,
  directory,
  path,
}: {
  line: Line;
  directory: string;
  path: string;
}): ReactNode {
  const link = `/file/${directory}/${path}${window.location.search}#L${line.number}`;
  const isSelected = useSearchContext(
    (ctx) =>
      ctx.selectedHit?.path === path &&
      ctx.selectedHit.directory == directory &&
      ctx.selectedHit.line === line.number,
  );

  return (
    <div
      className={`flex font-mono hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}
    >
      <span className="w-12 border-r border-gray-200 px-2 text-gray-500 select-none flex justify-end bg-gray-50">
        {line.number}
      </span>
      <a href={link} className="w-full">
        <CodeHighlight
          path={path}
          code={line.line}
          ranges={line.range ? [{ line: 1, range: line.range }] : undefined}
        />
      </a>
    </div>
  );
}

function Hit({ file }: { file: File }): ReactNode {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-300 bg-white text-gray-900 shadow-sm my-2 w-full">
      <div className="p-0.5 flex items-center bg-gray-100 border-b border-gray-300">
        <Link
          to={`/file/${file.directory}/${file.path}${window.location.search}`}
          className="text-blue-600 hover:text-blue-800 font-medium px-1 text-base"
        >
          {file.directory}/{file.path}
        </Link>
      </div>
      {file.lines && (
        <div>
          {file.lines.map((line, i, arr) => (
            <Fragment key={line.number}>
              {arr[i - 1]?.number < line.number - 1 && (
                <div className="h-px w-full bg-gray-300" />
              )}
              <CodeLine
                line={line}
                directory={file.directory}
                path={file.path}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export function Search(): ReactNode {
  const resultState = useSearchContext((ctx) => ctx.searchResult);
  if (resultState == null) return null;

  const { loading, error, result } = resultState;
  if (loading) return <div className="text-center my-8">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded m-4">
        <strong>Error:</strong> {error.message}
      </div>
    );

  return (
    <div className="px-2 py-1 w-full max-w-none mx-auto">
      {result!.files.map((file) => (
        <Hit key={file.directory + file.path + file.range} file={file} />
      ))}
    </div>
  );
}
