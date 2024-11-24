import type { PropsWithChildren, ReactNode } from 'react';
import { useLayoutEffect } from 'react';
import { Button, Checkbox, Divider, Group, Input, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { getSearchUrl, useSearchQuery } from '../libs/use-search-query';
import { useNavigate } from 'react-router-dom';

export interface GetInputPropsReturnType {
  onChange: any;
  value?: any;
  checked?: any;
  onFocus?: any;
  onBlur?: any;
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
  const params = useSearchQuery();
  const navigate = useNavigate();
  const form = useForm({
    initialValues: params,
  });

  useLayoutEffect(() => {
    form.setValues(params);
  }, Object.values(params));

  return (
    <form onSubmit={form.onSubmit((values) => navigate(getSearchUrl(values)))}>
      <Group justify="center" my="xs" gap="xs">
        <Text size="lg">Lines matching</Text>
        <Shortcut shortcut="q">
          <TextInput width={300} {...form.getInputProps('q')} />
        </Shortcut>
        <Text size="lg">in files matching</Text>
        <Shortcut shortcut="f">
          <TextInput width={200} {...form.getInputProps('f')} />
        </Shortcut>
        <Text size="lg">and not</Text>
        <Shortcut shortcut="x">
          <TextInput width={200} {...form.getInputProps('x')} />
        </Shortcut>
        <Text size="lg">case insensitive</Text>
        <Shortcut shortcut="i">
          <Checkbox {...form.getInputProps('i')} />
        </Shortcut>
        <Shortcut shortcut="s">
          <Button type="submit" size="xs">
            Search
          </Button>
        </Shortcut>
      </Group>
      <Divider />
    </form>
  );
}
