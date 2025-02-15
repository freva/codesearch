import type { RefObject } from 'react';

// Without setting a string value the reducer fails with https://github.com/microsoft/TypeScript/issues/28102 :(
export enum ACTION {
  SET_FILTERS = 'SET_FILTERS',

  SELECT_QUERY_INPUT = 'SELECT_QUERY_INPUT',
  SELECT_FILE_INPUT = 'SELECT_FILE_INPUT',
  SELECT_EXCLUDE_FILE_INPUT = 'SELECT_EXCLUDE_FILE_INPUT',
  TOGGLE_CASE_INSENSITIVE = 'TOGGLE_CASE_INSENSITIVE',

  SELECT_PREVIOUS = 'SELECT_PREVIOUS',
  SELECT_NEXT = 'SELECT_NEXT',
  SELECT_PREVIOUS_PAGE = 'SELECT_PREVIOUS_PAGE',
  SELECT_NEXT_PAGE = 'SELECT_NEXT_PAGE',
  SELECT_FIRST = 'SELECT_FIRST',
  SELECT_LAST = 'SELECT_LAST',

  SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS',
}

export type Range = [number, number];
export type Line = { line: string; number: number; ranges?: Range[] };
export type File = {
  path: string;
  uri?: string;
  range?: Range;
  lines?: Line[];
};
export type SearchResult = {
  files: File[];
  truncated: boolean;
  hits: number;
};
type SearchResultState = {
  loading: boolean;
  error?: { message: string };
  results?: SearchResult;
};

export type State = {
  filters: Filters;
  inputs: Record<keyof Filters, RefObject<HTMLInputElement | null>>;
  results?: SearchResultState;
};

export type Filters = {
  query: string;
  file: string;
  excludeFile: string;
  caseInsensitive: boolean;
};

export type ActionData =
  | [ACTION.SET_FILTERS, Filters]
  | [
      | ACTION.SELECT_QUERY_INPUT
      | ACTION.SELECT_FILE_INPUT
      | ACTION.SELECT_EXCLUDE_FILE_INPUT
      | ACTION.TOGGLE_CASE_INSENSITIVE
      | ACTION.SELECT_PREVIOUS
      | ACTION.SELECT_NEXT
      | ACTION.SELECT_PREVIOUS_PAGE
      | ACTION.SELECT_NEXT_PAGE
      | ACTION.SELECT_FIRST
      | ACTION.SELECT_LAST,
    ]
  | [ACTION.SET_SEARCH_RESULTS, SearchResultState];

export { SearchContextProvider, useSearchContext, dispatch } from './provider';
