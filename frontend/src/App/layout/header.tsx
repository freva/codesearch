import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import type { Filters } from '../pages/store';
import { useSearchContext } from '../pages/store';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createUrlParams } from '../pages/store/url-params.ts';

export function unfocus(): void {
  const elem = document.activeElement;
  if (elem instanceof HTMLElement) elem.blur();
}

function Shortcut({
  children,
  shortcut,
}: PropsWithChildren<{ shortcut: string }>): ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {children}
      <span style={{ fontSize: '1rem', color: '#888' }}>{shortcut}</span>
    </div>
  );
}

function TextInput({
  name,
  control,
  width,
  ...props
}: {
  name: keyof Omit<Filters, 'caseInsensitive'>;
  control: Control<Filters>;
  ta?: CSSProperties['textAlign'];
  width: number;
}): ReactNode {
  return (
    <Controller
      render={({ field }) => (
        <input
          style={{
            width,
            fontSize: '1.1rem',
            padding: '0.2rem 0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
          {...field}
          {...props}
        />
      )}
      {...{ name, control }}
    />
  );
}

export function Header(): ReactNode {
  const form = useSearchContext((ctx) => ctx.form);
  const navigate = useNavigate();

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        navigate(`/${createUrlParams(values)}`);
        unfocus();
      })}
      style={{
        margin: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>Lines matching</span>
        <Shortcut shortcut="q">
          <TextInput name="query" control={form.control} width={300} />
        </Shortcut>
        <span style={{ fontSize: '1.2rem' }}>in files matching</span>
        <Shortcut shortcut="f">
          <TextInput name="file" control={form.control} width={200} />
        </Shortcut>
        <span style={{ fontSize: '1.2rem' }}>and not</span>
        <Shortcut shortcut="x">
          <TextInput name="excludeFile" control={form.control} width={200} />
        </Shortcut>
        <span style={{ fontSize: '1.2rem' }}>context</span>
        <Shortcut shortcut="b">
          <TextInput
            name="numLinesBefore"
            control={form.control}
            width={40}
            ta="right"
          />
        </Shortcut>
        <Shortcut shortcut="a">
          <TextInput
            name="numLinesAfter"
            control={form.control}
            width={40}
            ta="right"
          />
        </Shortcut>
        <span style={{ fontSize: '1.2rem' }}>case insensitive</span>
        <Shortcut shortcut="i">
          <Controller
            name="caseInsensitive"
            control={form.control}
            render={({ field: { value, ...rest } }) => (
              <input
                type="checkbox"
                checked={value}
                {...rest}
                style={{ cursor: 'pointer' }}
              />
            )}
          />
        </Shortcut>
        <Shortcut shortcut="s">
          <button
            type="submit"
            style={{
              padding: '0.3rem 1rem',
              border: 'none',
              background: '#eee',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </Shortcut>
      </div>
      <div
        style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#ddd',
          margin: '0.5rem 0',
        }}
      />
    </form>
  );
}
