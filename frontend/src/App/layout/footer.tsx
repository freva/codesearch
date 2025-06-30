import { useSearchContext } from '../pages/store';
import type { ReactNode } from 'react';
import { Anchor, Divider, Group, Kbd, Stack, Text } from '@mantine/core';
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
    <Stack mt="auto" gap={0}>
      <Divider m={0} />
      <Group justify="space-between" p="xs">
        <Group>
          <Kbd size="xs">?</Kbd> toggle help
        </Group>
        <Text>{text}</Text>
        <Text>
          <Anchor href={`${backendUrl()}/rest/manifest`} target="_blank">
            repositories
          </Anchor>
          {` indexed at ${formatDate(new Date(result.updatedAt))}`}
        </Text>
      </Group>
    </Stack>
  );
}
