import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';

const columns: {
  header?: string;
  keys: { keys: string[]; description: string; joiner?: string }[];
}[] = [
  {
    header: 'General',
    keys: [
      { keys: ['Esc'], description: 'Unfocus filter input' },
      { keys: ['?'], description: 'Toggle help (this window)' },
      { keys: ['q'], description: 'Focus line filter input' },
      { keys: ['f'], description: 'Focus file filter input' },
      { keys: ['x'], description: 'Focus exclude path input' },
      { keys: ['['], description: 'Focus context before input' },
      { keys: [']'], description: 'Focus context after input' },
      { keys: ['i'], description: 'Toggle case sensitivity' },
      { keys: ['s'], description: 'Search' },
      { keys: ['r'], description: 'Reset search form' },
    ],
  },
  {
    header: 'Navigation',
    keys: [
      { keys: ['k', '▲'], description: 'Select hit above', joiner: ' or ' },
      { keys: ['j', '▼'], description: 'Select hit below', joiner: ' or ' },
    ],
  },
  {
    header: 'Open selected file',
    keys: [
      { keys: ['o', 'O'], description: 'In file view (tab / window)' },
      { keys: ['f', 'F'], description: 'In file in GitHub (tab / window)' },
      { keys: ['b', 'B'], description: 'In blame in GitHub (tab / window)' },
      { keys: ['h', 'H'], description: 'In history in GitHub (tab / window)' },
    ],
  },
];

function Column({
  header,
  keys,
}: {
  header?: string;
  keys: { keys: string[]; description: string; joiner?: string }[];
}): ReactNode {
  return (
    <div className="mb-4">
      {header && <div className="font-extrabold">{header}</div>}
      <div className="grid grid-cols-[max-content_auto] gap-1.5">
        {keys.map(({ keys, description, joiner = ' / ' }, i1: number) => (
          <Fragment key={i1}>
            <div>
              {keys.map((key, i2: number) => (
                <Fragment key={i2}>
                  {i2 > 0 && <span className="mx-0.5 text-gray-400">{joiner}</span>}
                  <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono">{key}</kbd>
                </Fragment>
              ))}
            </div>
            <div className="text-gray-700">{description}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcuts(): ReactNode {
  const [open, setOpen] = useKeyboardShortcuts();
  if (!open) return null;

  const onClose = (): void => {
    setOpen(false);
  };
  return (
    <div
      className="fixed inset-0 z-[1000] flex h-screen w-screen items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-[90vw] min-w-[300px] overflow-y-auto rounded-lg bg-white p-8"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="mb-4 text-lg font-bold">Keyboard Shortcuts</div>
        <div className="flex flex-wrap gap-8">
          {columns.map((col, i: number) => (
            <Column key={i} {...col} />
          ))}
        </div>
        <button
          type="button"
          className="mt-8 cursor-pointer rounded border-none bg-gray-200 px-4 py-2"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
