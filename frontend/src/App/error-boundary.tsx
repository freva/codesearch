import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { PureComponent } from 'react';

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '55px',
        }}
      >
        {/*<Icon name="bug" size="4x" />*/}
        <h1 style={{ fontSize: '2rem', margin: '1rem 0' }}>
          You encountered a bug
        </h1>
        <div style={{ marginBottom: '0.5rem' }}>Error details:</div>
        <textarea
          rows={10}
          cols={80}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          value={JSON.stringify(this.state.error, null, 2)}
          style={{ backgroundColor: '#fff', color: '#000' }}
        />
      </div>
    );
  }
}
