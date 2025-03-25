import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { Button, Checkbox, Divider, Group, Input, Text } from '@mantine/core';
import type { Filters } from '../pages/store';
import { useSearchContext } from '../pages/store';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createUrlParams } from '../pages/store/url-params.ts';

function Shortcut({
  children,
  shortcut,
}: PropsWithChildren<{ shortcut: string }>): ReactNode {
  return (
    <div style={{ display: 'flex', verticalAlign: 'top' }}>
      {children}
      <Text size="md">{shortcut}</Text>
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
      render={({ field: { ref, ...field } }) => (
        <Input
          ref={(r) => ref(r)}
          size="xs"
          fz="lg"
          style={{ width }}
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
      onSubmit={form.handleSubmit((values) =>
        navigate(`/${createUrlParams(values)}`),
      )}
    >
      <Group justify="center" my="xs" gap="xs">
        <Text size="lg">Lines matching</Text>
        <Shortcut shortcut="q">
          <TextInput name="query" control={form.control} width={300} />
        </Shortcut>
        <Text size="lg">in files matching</Text>
        <Shortcut shortcut="f">
          <TextInput name="file" control={form.control} width={200} />
        </Shortcut>
        <Text size="lg">and not</Text>
        <Shortcut shortcut="x">
          <TextInput name="excludeFile" control={form.control} width={200} />
        </Shortcut>
        <Text size="lg">context</Text>
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
        <Text size="lg">case insensitive</Text>
        <Shortcut shortcut="i">
          <Controller
            name="caseInsensitive"
            control={form.control}
            render={({ field: { value, ...rest } }) => (
              <Checkbox checked={value} {...rest} />
            )}
          />
        </Shortcut>
        <Shortcut shortcut="s">
          <Button type="submit" size="xs">
            Search
          </Button>
        </Shortcut>
      </Group>
      <Divider mb="sm" />
    </form>
  );
}
