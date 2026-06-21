import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { CodeHighlight } from '../file/code-highlight';
import type { File, Line } from '../store';
import { useSearchContext } from '../store';

function CodeLine({ line, directory, path }: { line: Line; directory: string; path: string }): ReactNode {
  const link = `/file/${directory}/${path}${window.location.search}#L${line.number}`;
  const isSelected = useSearchContext(
    (ctx) =>
      ctx.selectedHit?.path === path && ctx.selectedHit.directory == directory && ctx.selectedHit.line === line.number,
  );

  return (
    <div className={`flex font-mono hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}>
      <span className="flex w-12 justify-end border-r border-gray-200 bg-gray-50 px-2 text-gray-500 select-none">
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
  const filePath = `${file.directory}/${file.path}`;
  // Line-less entries (list/file-filter results) are selected at the file level (line 0)
  const isSelected = useSearchContext(
    (ctx) =>
      ctx.selectedHit?.line === 0 && ctx.selectedHit.path === file.path && ctx.selectedHit.directory == file.directory,
  );
  return (
    <div className="my-2 w-full">
      <Link
        to={`${filePath.endsWith('/') ? '/list' : '/file'}/${filePath}${window.location.search}`}
        className={`truncate px-2 py-1 font-medium text-blue-600 hover:text-blue-800 ${isSelected ? 'bg-blue-100' : ''}`}
        title={filePath}
      >
        {filePath}
      </Link>
      {file.lines && (
        <div className="overflow-hidden rounded-sm border border-gray-300 bg-white shadow-sm">
          {file.lines.map((line, i, arr) => (
            <Fragment key={line.number}>
              {arr[i - 1]?.number < line.number - 1 && <div className="h-px w-full bg-gray-300" />}
              <CodeLine line={line} directory={file.directory} path={file.path} />
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
  if (loading) return <div className="my-8 text-center">Loading...</div>;
  if (error)
    return (
      <div className="m-4 rounded bg-red-100 p-4 text-red-700">
        <strong>Error:</strong> {error.message}
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-none px-2 py-1">
      {result!.files.map((file) => (
        <Hit key={file.directory + file.path + String(file.range)} file={file} />
      ))}
    </div>
  );
}
