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
    };
    this.setState({ error: meta });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mt-[55px] flex flex-col items-center">
        <h1 className="my-4 text-2xl font-bold">You encountered a bug</h1>
        <div className="mb-2 text-gray-700">Error details:</div>
        <textarea
          rows={10}
          cols={80}
          onClick={(e) => {
            e.currentTarget.select();
          }}
          readOnly
          value={JSON.stringify(this.state.error, null, 2)}
          className="resize-none rounded border border-gray-300 bg-white p-2 font-mono text-black"
        />
      </div>
    );
  }
}
