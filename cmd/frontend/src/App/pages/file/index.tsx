import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useGet } from '../../libs/fetcher';
import { CodeHighlight } from './code-highlight';
import {
  Alert,
  Breadcrumbs,
  Container,
  Flex,
  Loader,
  Text,
} from '@mantine/core';

type LineMatch = { line: number; range: [number, number] };
type FileResponse = { content: string; matches: LineMatch[] };

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
  const { search, hash } = useLocation();
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
          element.scrollIntoView({ block: 'nearest' });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100)); // thisisfine.jpg
      }
    })();
  }, [hash]);

  return (
    <Flex direction="row" gap="sm" ff="monospace" bd="1px solid #000">
      <Flex direction="column" ta="right" pl="lg">
        {Array.from({ length: countLines(code) })
          .map((_, i) => i + 1)
          .map((i) => (
            <Link to={`${search}#L${i}`} key={i}>
              {i}.
            </Link>
          ))}
      </Flex>
      <CodeHighlight {...{ code, ranges, path }} />
    </Flex>
  );
}

export function File(): ReactNode {
  const file = useParams()['*']!;
  const params = new URLSearchParams(window.location.search);
  params.set('p', file);
  const { loading, error, response } = useGet<FileResponse>(
    `/rest/file?${params.toString()}`,
  );

  if (loading) return <Loader color="blue" />;
  if (error)
    return (
      <Alert variant="filled" color="red" title={error.message} m="xl"></Alert>
    );
  return (
    <Container fluid>
      <Breadcrumbs fz="lg" my="sm">
        {file.split('/').map((name, i, arr) =>
          i == arr.length - 1 ? (
            <Text key={`${i}-${name}`}>{name}</Text>
          ) : (
            <Link
              key={`${i}-${name}`}
              to={'/file/' + arr.slice(0, i).join('/')}
            >
              {name}
            </Link>
          ),
        )}
      </Breadcrumbs>
      <FileContent
        code={response.content}
        path={file}
        ranges={response.matches}
      />
    </Container>
  );
}
