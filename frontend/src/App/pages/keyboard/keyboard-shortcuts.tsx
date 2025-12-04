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
      { keys: ['b'], description: 'Focus context before input' },
      { keys: ['a'], description: 'Focus context after input' },
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
        {keys.map(({ keys, description, joiner }, i1: number) => (
          <Fragment key={i1}>
            <div>
              {keys.map((key, i2: number) => (
                <Fragment key={i2}>
                  {i2 > 0 && (
                    <span className="text-gray-400 mx-0.5">{joiner}</span>
                  )}
                  <kbd className="px-1.5 py-0.5 border border-gray-300 rounded bg-gray-50 font-mono text-sm">
                    {key}
                  </kbd>
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

  const onClose = (): void => setOpen(false);
  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black/40 z-[1000] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 rounded-lg min-w-[300px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-lg mb-4">Keyboard Shortcuts</div>
        <div className="flex gap-8 flex-wrap">
          {columns.map((col, i: number) => (
            <Column key={i} {...col} />
          ))}
        </div>
        <button
          className="mt-8 px-4 py-2 border-none bg-gray-200 rounded cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
