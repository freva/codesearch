import type { Context, Dispatch, PropsWithChildren, ReactNode } from 'react';
import { useLayoutEffect, useReducer, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createContext, useContextSelector } from 'use-context-selector';
import { ACTION } from '.';
import type { ActionData, State, SearchResult, Filters } from '.';
import { reducer } from './reducer';
import { parseUrlParams, createUrlParams } from './url-params';
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
    defaultValues: parseUrlParams(location.search),
  });
  const queryRef = useRef<string | undefined>(undefined);

  const [value, searchContextDispatch] = useReducer(reducer, {
    filters: parseUrlParams(location.search),
    form,
  });

  useLayoutEffect(() => {
    searchContextDispatchRef = searchContextDispatch;
    return (): void => (searchContextDispatchRef = undefined);
  }, []);

  // Every time the URL changes, update the state
  useLayoutEffect(() => {
    if (location.pathname !== '/') return;
    const filters = parseUrlParams(location.search);
    dispatch([ACTION.SET_FILTERS, filters]);
    form.reset(filters);
  }, [location.search]);

  // Every time the filters change, update the URL
  useLayoutEffect(() => {
    if (window.location.pathname !== '/') return;
    if (value.filters.query === '' && value.filters.file === '') return;
    const queryParams = createUrlParams(value.filters);
    if (queryRef.current === queryParams) return;
    queryRef.current = queryParams;

    dispatch([ACTION.SET_SEARCH_RESULTS, { loading: true }]);
    Get<SearchResult>(`/rest/search${queryParams}`)
      .then((results) => ({ loading: false, results }))
      .catch((error) => ({ loading: false, error }))
      .then((data) => dispatch([ACTION.SET_SEARCH_RESULTS, data]));

    if (queryParams !== window.location.search)
      navigate(window.location.pathname + queryParams);
  }, [navigate, value.filters]);

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
