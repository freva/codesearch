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
    <div style={{ marginBottom: '1rem' }}>
      {header && <div style={{ fontWeight: 800 }}>{header}</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'max-content auto',
          gap: '5px',
        }}
      >
        {keys.map(({ keys, description, joiner }, i1: number) => (
          <Fragment key={i1}>
            <div>
              {keys.map((key, i2: number) => (
                <Fragment key={i2}>
                  {i2 > 0 && (
                    <span style={{ color: '#888', margin: '0 2px' }}>
                      {joiner}
                    </span>
                  )}
                  <kbd
                    style={{
                      padding: '2px 6px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      background: '#f9f9f9',
                      fontFamily: 'monospace',
                    }}
                  >
                    {key}
                  </kbd>
                </Fragment>
              ))}
            </div>
            <div>{description}</div>
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          minWidth: '300px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}
        >
          Keyboard Shortcuts
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {columns.map((col, i: number) => (
            <Column key={i} {...col} />
          ))}
        </div>
        <button
          style={{
            marginTop: '2rem',
            padding: '0.5rem 1rem',
            border: 'none',
            background: '#eee',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
