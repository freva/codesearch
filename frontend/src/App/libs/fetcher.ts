import { useLayoutEffect, useReducer, useRef } from 'react';
import { useCustomCompareCallback } from './use-custom-compare-callback';

enum Method {
  GET = 'GET',
}

export type Params = {
  method?: Method;
  body?: string | FormData;
  json?: object;
  headers?: Record<string, string>;
};

export type HookParams<T, U> = Params & {
  responseMapper?: (response: T) => U;
};

export type HttpState<T> =
  | { loading: true; error?: undefined; response?: undefined }
  | { loading?: false; error: HttpError; response?: undefined }
  | { loading?: false; error?: undefined; response: T };
export type HttpStateWithReload<T> = HttpState<T> & { reloading: boolean };
export type HttpStateWithRefresh<T> = HttpStateWithReload<T> & {
  refresh: () => Promise<T>;
};

export class HttpError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

export function Get<T>(url: string, params?: Params): Promise<T> {
  return Fetch(Method.GET, url, params);
}

function reducer<T>(state: HttpStateWithReload<T>, action: Partial<HttpStateWithReload<T>>): HttpStateWithReload<T> {
  const newState = { ...state, ...action };
  if (action.response) delete newState.error;
  else if (action.error) delete newState.response;
  return newState as HttpStateWithReload<T>;
}

export function useGet<T, U = T>(url: string, params: HookParams<T, U> = {}): HttpStateWithRefresh<U> {
  const initialState: HttpStateWithReload<U> = {
    loading: true,
    reloading: true,
  };
  const [state, dispatch] = useReducer(reducer<U>, initialState);
  const cancelled = useRef(false);

  const refresh = useCustomCompareCallback(() => {
    if (cancelled.current) return Promise.reject(new Error('Cancelled'));
    dispatch({ reloading: true });
    return Get<T>(url, params)
      .then((originalResponse) => {
        const response = params.responseMapper
          ? params.responseMapper(originalResponse)
          : (originalResponse as unknown as U);
        if (!cancelled.current) dispatch({ loading: false, reloading: false, response });
        return response;
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (!cancelled.current) dispatch({ loading: false, reloading: false, error });
        const newError = new HttpError(`GET ${url}: ${error.message}`);
        newError.stack = error.stack;
        return Promise.reject(newError);
      });
  }, [url, params]);

  useLayoutEffect(() => {
    cancelled.current = false;
    return (): void => {
      cancelled.current = true;
    };
  }, []);
  useLayoutEffect(() => {
    // Initial parameters have changed, set loading
    dispatch({ loading: true });
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function backendUrl(): string {
  return window.localStorage.getItem('code-search-backend') ?? 'http://localhost:8080';
}

async function Fetch<T>(method: Method, url: string, params: Params = {}): Promise<T> {
  if (!/^[A-Za-z]+:\/\//.exec(url)) url = backendUrl() + url;

  params = { ...params }; // Copy to avoid mutating the original
  params.method = method;

  return (
    fetch(url, params)
      // Reject promise if response is not OK
      .then((response) => {
        if (response.ok) return response;
        return response.text().then((text) => {
          let message = text;
          try {
            const json = JSON.parse(text) as object | { message: string };
            if ('message' in json) message = json.message;
          } catch {
            // not JSON
          }
          return Promise.reject(new HttpError(message, response.status));
        });
      })

      // automatically return the data if it's a known content type
      .then((response) => {
        const contentType = response.headers.get('content-type');
        if (!contentType) return response;
        if (contentType.includes('application/json')) {
          return response.json();
        } else if (contentType.includes('text/plain')) {
          return response.text();
        }
        return response;
      }) as Promise<T>
  );
}
