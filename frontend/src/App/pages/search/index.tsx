import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLayoutEffect } from 'react';
import { Get } from '../../libs/fetcher';
import { useSearchParams } from 'react-router-dom';
import { Alert, Loader } from '@mantine/core';
import './index.css';

type Range = [number, number];
type Line = { line: string; number: number; ranges?: Range[] };
type File = { path: string; uri?: string; range?: Range; lines?: Line[] };
type SearchResponse = { files: File[]; truncated: boolean; hits: number };

type HttpState = { loading: boolean; error?: Error; response?: SearchResponse };

function CodeLine({ line }: { line: Line }): ReactNode {
  return (
    <tr>
      <td>{line.number}.</td>
      <td>{line.line}</td>
    </tr>
  );
}

function Hit({ file }: { file: File }): ReactNode {
  return (
    <div>
      <div>{file.path}</div>
      {file.lines && (
        <table>
          {file.lines.map((line) => (
            <CodeLine key={line.number} line={line} />
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
    <>
      {response!.files.map((file, i) => (
        <Hit key={`${i} ${file.path}`} file={file} />
      ))}
    </>
  );
}
