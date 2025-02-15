import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { useLayoutEffect } from 'react';
import { Button, Checkbox, Divider, Group, Input, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { ACTION, dispatch, useSearchContext } from '../pages/store';

export interface GetInputPropsReturnType {
  onChange: any;
  value?: any;
  checked?: any;
  onFocus?: any;
  onBlur?: any;
  ref: RefObject<HTMLInputElement | null>;
}

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
  width,
  ...props
}: GetInputPropsReturnType & { width: number }): ReactNode {
  return <Input size="xs" fz="lg" style={{ width }} {...props} />;
}

export function Header(): ReactNode {
  const filters = useSearchContext((ctx) => ctx.filters);
  const inputs = useSearchContext((ctx) => ctx.inputs);
  const form = useForm({ initialValues: filters });

  useLayoutEffect(() => {
    form.setValues(filters);
  }, Object.values(filters));

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        dispatch([ACTION.SET_FILTERS, values]),
      )}
    >
      <Group justify="center" my="xs" gap="xs">
        <Text size="lg">Lines matching</Text>
        <Shortcut shortcut="q">
          <TextInput
            ref={inputs.query}
            width={300}
            {...form.getInputProps('query')}
          />
        </Shortcut>
        <Text size="lg">in files matching</Text>
        <Shortcut shortcut="f">
          <TextInput
            ref={inputs.file}
            width={200}
            {...form.getInputProps('file')}
          />
        </Shortcut>
        <Text size="lg">and not</Text>
        <Shortcut shortcut="x">
          <TextInput
            ref={inputs.excludeFile}
            width={200}
            {...form.getInputProps('excludeFile')}
          />
        </Shortcut>
        <Text size="lg">case insensitive</Text>
        <Shortcut shortcut="i">
          <Checkbox
            ref={inputs.caseInsensitive}
            {...form.getInputProps('caseInsensitive')}
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
