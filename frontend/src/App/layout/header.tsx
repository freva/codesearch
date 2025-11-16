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
    <div className="flex items-center gap-2">
      {children}
      <span className="text-base text-gray-500">{shortcut}</span>
    </div>
  );
}

function TextInput({
  name,
  control,
  width,
  ta,
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
          className="text-[1.1rem] px-2 py-1 border border-gray-300 rounded"
          style={{ width, textAlign: ta }}
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
      className="my-4 flex flex-col items-center"
    >
      <div className="flex items-center gap-4 mb-2">
        <span>Lines matching</span>
        <Shortcut shortcut="q">
          <TextInput name="query" control={form.control} width={300} />
        </Shortcut>
        <span>in files matching</span>
        <Shortcut shortcut="f">
          <TextInput name="file" control={form.control} width={200} />
        </Shortcut>
        <span>and not</span>
        <Shortcut shortcut="x">
          <TextInput name="excludeFile" control={form.control} width={200} />
        </Shortcut>
        <span>context</span>
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
        <span>case insensitive</span>
        <Shortcut shortcut="i">
          <Controller
            name="caseInsensitive"
            control={form.control}
            render={({ field: { value, ...rest } }) => (
              <input
                type="checkbox"
                checked={value}
                {...rest}
                className="cursor-pointer"
              />
            )}
          />
        </Shortcut>
        <Shortcut shortcut="s">
          <button
            type="submit"
            className="px-4 py-1 bg-gray-100 rounded border-none cursor-pointer"
          >
            Search
          </button>
        </Shortcut>
      </div>
      <div className="w-full h-px bg-gray-200 my-2" />
    </form>
  );
}
