import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Loader } from '@mantine/core';
import { CodeHighlight } from '../file/code-highlight';
import type { File, Line } from '../store';
import { useSearchContext } from '../store';

function CodeLine({ line, path }: { line: Line; path: string }): ReactNode {
  const navigate = useNavigate();
  const link = `/file/${path}${window.location.search}#L${line.number}`;
  return (
    <tr>
      <td>
        <Link to={link}>{line.number}.</Link>
      </td>
      <td onClick={() => navigate(link)}>
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
            {file.lines.map((line) => (
              <CodeLine key={line.number} line={line} path={file.path} />
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
