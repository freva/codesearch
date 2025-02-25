import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Loader } from '@mantine/core';
import { CodeHighlight } from '../file/code-highlight';
import type { File, Line } from '../store';
import { useSearchContext } from '../store';

function CodeLine({
  line,
  path,
  blockStart,
  blockEnd,
}: {
  line: Line;
  path: string;
  blockStart: boolean;
  blockEnd: boolean;
}): ReactNode {
  const navigate = useNavigate();
  const link = `/file/${path}${window.location.search}#L${line.number}`;
  const isSelected = useSearchContext(
    (ctx) =>
      ctx.selectedHit?.path === path && ctx.selectedHit.line === line.number,
  );

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <Link to={link}>{line.number}.</Link>
      </td>
      <td
        onClick={() => navigate(link)}
        className={`block ${blockStart ? 'block-start' : ''} ${blockEnd ? 'block-end' : ''}`}
      >
        <CodeHighlight path={path} code={line.line} />
      </td>
    </tr>
  );
}

function Hit({ file }: { file: File }): ReactNode {
  return (
    <div>
      <div>
        <Link to={`/file/${file.path}`}>{file.path}</Link>
      </div>
      {file.lines && (
        <table className="hit">
          <tbody>
            {file.lines.map((line, i, arr) => (
              <CodeLine
                key={line.number}
                line={line}
                path={file.path}
                blockStart={arr[i - 1]?.number < line.number - 1}
                blockEnd={arr[i + 1]?.number > line.number + 1}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Search(): ReactNode {
  const resultState = useSearchContext((ctx) => ctx.results);
  if (resultState == null) return null;

  const { loading, error, results } = resultState;
  if (loading) return <Loader color="blue" />;
  if (error)
    return <Alert variant="filled" color="red" title={error.message} m="xl" />;

  return (
    <div className="container">
      {results!.files.map((file) => (
        <Hit key={`${file.path}:${file.range}`} file={file} />
      ))}
    </div>
  );
}
