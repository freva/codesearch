import type { CSSProperties, ReactNode } from 'react';
import type { Filters } from '../pages/store';
import { useSearchContext } from '../pages/store';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createUrlParams } from '../pages/store/url-params';
import { LuArrowDown, LuArrowUp } from 'react-icons/lu';
import { unfocus } from '../pages/keyboard/use-keyboard-shortcuts';

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
  placeholder?: string;
}): ReactNode {
  return (
    <Controller
      render={({ field }) => (
        <input
          className="h-8 rounded-md border border-gray-300 bg-white px-2 py-1 text-base text-gray-900 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          style={{ width, textAlign: ta }}
          {...field}
          {...props}
        />
      )}
      {...{ name, control }}
    />
  );
}

function ToggleButton({
  control,
  name,
  children,
}: {
  control: Control<Filters>;
  name: 'caseInsensitive';
  children: ReactNode;
}): ReactNode {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <button
          type="button"
          onClick={() => {
            onChange(!value);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 ${value ? 'bg-gray-100 text-gray-400 hover:bg-blue-100' : 'bg-blue-200 text-blue-700'}`}
        >
          {children}
        </button>
      )}
    />
  );
}

export function Header(): ReactNode {
  const form = useSearchContext((ctx) => ctx.form);
  const navigate = useNavigate();

  return (
    <div className="border-b border-gray-200 bg-white p-1.5">
      <form
        onSubmit={(e) => {
          void form.handleSubmit((values) => {
            void navigate(`/${createUrlParams(values)}`);
            unfocus();
          })(e);
        }}
        className="flex items-center justify-center gap-2"
      >
        <TextInput name="query" control={form.control} width={300} placeholder="Line filter" />
        <TextInput name="file" control={form.control} width={250} placeholder="File path filter" />
        <TextInput name="excludeFile" control={form.control} width={250} placeholder="Exclude path filter" />

        <div className="flex items-center gap-1" title="Lines before">
          <LuArrowUp className="text-gray-400" />
          <TextInput name="numLinesBefore" control={form.control} width={40} ta="right" />
        </div>

        <div className="flex items-center gap-1" title="Lines after">
          <LuArrowDown className="text-gray-400" />
          <TextInput name="numLinesAfter" control={form.control} width={40} ta="right" />
        </div>

        <ToggleButton name="caseInsensitive" control={form.control}>
          <span className="px-1 text-xs font-semibold text-gray-600 select-none" title="Case-sensitive">
            Aa
          </span>
        </ToggleButton>

        <button
          type="submit"
          className="h-8 gap-1.5 rounded-md border border-blue-700 bg-blue-500 px-4 text-white shadow transition-colors duration-150 hover:bg-blue-600"
        >
          Search
        </button>
      </form>
    </div>
  );
}
