import type { PropsWithChildren, ReactNode } from 'react';
import { useLayoutEffect, useReducer, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ACTION, dispatch } from '.';
import type { SearchResult, Filters, FileResult } from '.';
import { reducer } from './reducer';
import { parseUrlParams } from './url-params';
import { Get } from '../../libs/fetcher';
import { useForm } from 'react-hook-form';
import { internal } from './context';

function normalizeError(error: unknown): { message: string } {
  if (error instanceof Error) return { message: error.message };
  if (typeof error === 'string') return { message: error };
  return { message: 'Unknown error' };
}

export function SearchContextProvider({ children }: PropsWithChildren): ReactNode {
  const location = useLocation();
  const navigate = useNavigate();
  const form = useForm<Filters>({
    defaultValues: parseUrlParams(location.search),
    shouldUnregister: true,
  });
  const queryRef = useRef<string | undefined>(undefined);

  const [value, searchContextDispatch] = useReducer(reducer, { form });

  useLayoutEffect(() => {
    internal.searchContextDispatchRef = searchContextDispatch;
    return (): void => (internal.searchContextDispatchRef = undefined);
  }, []);

  // Every time the URL changes, update the state
  useLayoutEffect(() => {
    if (location.pathname === '/') {
      const queryParams = location.search;
      if (queryRef.current === queryParams) return;
      queryRef.current = queryParams;

      dispatch([ACTION.SET_FILE_RESULT, undefined]);
      if (queryParams === '') {
        dispatch([ACTION.SET_SEARCH_RESULT, undefined]);
        return;
      }

      dispatch([ACTION.SET_SEARCH_RESULT, { loading: true }]);
      void Get<SearchResult>(`/rest/search${queryParams}`)
        .then((result) => ({ loading: false, result }))
        .catch((error: unknown) => ({ loading: false, error: normalizeError(error) }))
        .then((data) => {
          dispatch([ACTION.SET_SEARCH_RESULT, data]);
        });
    } else if (location.pathname.startsWith('/file/')) {
      const params = new URLSearchParams(location.search);
      params.set('p', location.pathname.substring(6));

      dispatch([ACTION.SET_FILE_RESULT, { loading: true }]);
      void Get<FileResult>(`/rest/file?${params.toString()}`)
        .then((result) => ({ loading: false, result }))
        .catch((error: unknown) => ({ loading: false, error: normalizeError(error) }))
        .then((data) => {
          dispatch([ACTION.SET_FILE_RESULT, data]);
        });
    } else {
      void navigate('/', { replace: true });
      dispatch([ACTION.SET_SEARCH_RESULT, undefined]);
      dispatch([ACTION.SET_FILE_RESULT, undefined]);
    }
  }, [navigate, location.pathname, location.search]);

  // eslint-disable-next-line react-x/no-context-provider
  return <internal.context.Provider value={value}>{children}</internal.context.Provider>;
}
