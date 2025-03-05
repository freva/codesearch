import type { ReactNode } from 'react';
import { Fragment } from 'react';
import type { SimpleGridProps } from '@mantine/core';
import { Box, Kbd, Modal, Stack, Text } from '@mantine/core';
import classNames from './keyboard-shortcuts.module.css';
import { URL_GENERATORS, useKeyboardShortcuts } from './use-keyboard-shortcuts';

type KeyDescription = {
  keys: string[];
  description: string;
  joiner: string;
};

function Columns(props: SimpleGridProps): ReactNode {
  return <Box className={classNames.columns} {...props} />;
}

function shortcut(
  keys: string | string[],
  description: string,
  joiner: string = ' then ',
): KeyDescription {
  if (typeof keys === 'string') keys = [keys];
  return { keys, description, joiner };
}

function Column({
  header,
  keys,
}: {
  header?: string;
  keys: KeyDescription[];
}): ReactNode {
  return (
    <>
      <Stack>
        {header && <Text fw={800}>{header}</Text>}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content auto',
            gap: '5px',
          }}
        >
          {keys.map(({ keys, description, joiner }, i1) => (
            <Fragment key={i1}>
              <Box>
                {keys.map((key, i2) => (
                  <Fragment key={i2}>
                    {i2 > 0 && (
                      <Text span c="dimmed">
                        {joiner}
                      </Text>
                    )}
                    <Kbd>{key}</Kbd>
                  </Fragment>
                ))}
              </Box>
              <Box>{description}</Box>
            </Fragment>
          ))}
        </Box>
      </Stack>
    </>
  );
}

export function KeyboardShortcuts(): ReactNode {
  const [open, setOpen] = useKeyboardShortcuts();

  return (
    <Modal
      opened={open}
      closeOnClickOutside
      closeOnEscape
      onClose={() => setOpen(false)}
      title="Keyboard shortcuts"
      size="80%"
    >
      <Stack gap="lg">
        <Columns>
          <Column
            header="General"
            keys={[
              shortcut('Esc', 'Unfocus filter input'),
              shortcut('?', 'Toggle help (this window)'),
              shortcut('q', 'Focus query input'),
              shortcut('f', 'Focus file input'),
              shortcut('x', 'Focus exclude file input'),
              shortcut('b', 'Focus context before input'),
              shortcut('a', 'Focus context after input'),
              shortcut('i', 'Toggle case insensitivity'),
              shortcut('s', 'Search'),
            ]}
          />
          <Stack>
            <Column
              header="Navigation"
              keys={[
                shortcut(['k', '▲'], 'Select hit above', ' or '),
                shortcut(['j', '▼'], 'Select hit below', ' or '),
              ]}
            />
            <Column
              header="Open..."
              keys={URL_GENERATORS.map(({ key, name }) =>
                shortcut(
                  [key, key.toUpperCase()],
                  `${name} in this / new window`,
                  ' / ',
                ),
              )}
            />
          </Stack>
        </Columns>
      </Stack>
    </Modal>
  );
}
