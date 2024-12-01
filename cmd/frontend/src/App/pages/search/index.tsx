import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLayoutEffect } from 'react';
import { Get } from '../../libs/fetcher';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Loader } from '@mantine/core';
import { CodeHighlight } from '../file/code-highlight';

type Range = [number, number];
type Line = { line: string; number: number; ranges?: Range[] };
type File = { path: string; uri?: string; range?: Range; lines?: Line[] };
type SearchResponse = { files: File[]; truncated: boolean; hits: number };

type HttpState = { loading: boolean; error?: Error; response?: SearchResponse };

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
          {file.lines.map((line) => (
            <CodeLine key={line.number} line={line} path={file.path} />
          ))}
        </table>
      )}
    </div>
  );
}

export function Search(): ReactNode {
  const params = useSearchParams()[0].toString();
  const [{ loading, error, response }, setHttp] = useState<HttpState>({
    loading: true,
  });
  useLayoutEffect(() => {
    if (params.length === 0) return;
    Get<SearchResponse>(`/rest/search?${params}`)
      .then((response) => setHttp({ loading: false, response }))
      .catch((error) => setHttp({ loading: false, error }));
  }, [params]);

  if (params.length === 0) return null;
  if (loading) return <Loader color="blue" />;
  if (error)
    return (
      <Alert variant="filled" color="red" title={error.message} m="xl"></Alert>
    );
  return (
    <div className="container">
      {response!.files.map((file, i) => (
        <Hit key={`${i} ${file.path}`} file={file} />
      ))}
    </div>
  );
}
