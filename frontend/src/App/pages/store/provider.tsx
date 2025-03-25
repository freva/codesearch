import type { Context, Dispatch, PropsWithChildren, ReactNode } from 'react';
import { useLayoutEffect, useReducer, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createContext, useContextSelector } from 'use-context-selector';
import { ACTION } from '.';
import type { ActionData, State, SearchResult, Filters, FileResult } from '.';
import { reducer } from './reducer';
import { parseUrlParams } from './url-params';
import { Get } from '../../libs/fetcher';
import { useForm } from 'react-hook-form';

let searchContextDispatchRef: Dispatch<ActionData> | undefined;
const context = createContext<State | undefined>(undefined);

export function SearchContextProvider({
  children,
}: PropsWithChildren): ReactNode {
  const location = useLocation();
  const navigate = useNavigate();
  const form = useForm<Filters>({
    values: parseUrlParams(location.search),
    shouldUnregister: true,
  });
  const queryRef = useRef<string | undefined>(undefined);

  const [value, searchContextDispatch] = useReducer(reducer, { form });

  useLayoutEffect(() => {
    searchContextDispatchRef = searchContextDispatch;
    return (): void => (searchContextDispatchRef = undefined);
  }, []);

  // Every time the URL changes, update the state
  useLayoutEffect(() => {
    if (location.pathname === '/search') {
      const queryParams = location.search;
      if (queryRef.current === queryParams) return;
      queryRef.current = queryParams;

      dispatch([ACTION.SET_FILE_RESULT, undefined]);
      if (queryParams === '')
        return dispatch([ACTION.SET_SEARCH_RESULT, undefined]);

      dispatch([ACTION.SET_SEARCH_RESULT, { loading: true }]);
      Get<SearchResult>(`/rest/search${queryParams}`)
        .then((result) => ({ loading: false, result }))
        .catch((error) => ({ loading: false, error }))
        .then((data) => dispatch([ACTION.SET_SEARCH_RESULT, data]));
    } else if (location.pathname.startsWith('/file/')) {
      const params = new URLSearchParams(location.search);
      params.set('p', location.pathname.substring(6));

      dispatch([ACTION.SET_FILE_RESULT, { loading: true }]);
      Get<FileResult>(`/rest/file?${params.toString()}`)
        .then((result) => ({ loading: false, result }))
        .catch((error) => ({ loading: false, error }))
        .then((data) => dispatch([ACTION.SET_FILE_RESULT, data]));
    } else if (location.pathname !== '/' || location.search !== '') {
      navigate('/', { replace: true });
      dispatch([ACTION.SET_SEARCH_RESULT, undefined]);
      dispatch([ACTION.SET_FILE_RESULT, undefined]);
    }
  }, [location.pathname, location.search]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useSearchContext<T>(selector: (s: State) => T): T {
  return useContextSelector(context as Context<State>, selector);
}

export function dispatch(actionData: ActionData): void {
  if (!searchContextDispatchRef)
    throw new Error('Search context dispatch not set');
  searchContextDispatchRef(actionData);
}
