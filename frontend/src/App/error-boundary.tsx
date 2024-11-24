import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { PureComponent } from 'react';
import { Space, Stack, Text, Title } from '@mantine/core';

export class ErrorBoundary extends PureComponent<PropsWithChildren> {
  state: Readonly<{ error: unknown }>;
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { error: undefined };
  }

  componentDidCatch(exception: Error, errorInfo: ErrorInfo): void {
    const meta = {
      location: window.location.href,
      time: new Date().toISOString(),
      error: {
        exception: exception.stack ?? exception.message,
        ...errorInfo,
      },
      ...exception,
    };
    this.setState({ error: meta });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <Stack align="center">
        <Space h={55} />
        {/*<Icon name="bug" size="4x" />*/}
        <Title>You encountered a bug</Title>
        <Text>Error details:</Text>
        <textarea
          rows={10}
          cols={80}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          value={JSON.stringify(this.state.error, null, 2)}
          style={{ backgroundColor: '#fff', color: '#000' }}
        />
      </Stack>
    );
  }
}
