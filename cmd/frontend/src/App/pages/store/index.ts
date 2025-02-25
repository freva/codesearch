import type { UseFormReturn } from 'react-hook-form';

// Without setting a string value the reducer fails with https://github.com/microsoft/TypeScript/issues/28102 :(
export enum ACTION {
  SET_FILTERS = 'SET_FILTERS',
  SET_SELECTED_HIT = 'SET_SELECTED_HIT',
  SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS',

  SELECT_QUERY_INPUT = 'SELECT_QUERY_INPUT',
  SELECT_FILE_INPUT = 'SELECT_FILE_INPUT',
  SELECT_EXCLUDE_FILE_INPUT = 'SELECT_EXCLUDE_FILE_INPUT',
  TOGGLE_CASE_INSENSITIVE = 'TOGGLE_CASE_INSENSITIVE',

  SELECT_PREVIOUS = 'SELECT_PREVIOUS',
  SELECT_NEXT = 'SELECT_NEXT',
}

export type Range = [number, number];
export type Line = { line: string; number: number; range?: Range[] };
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
  form: UseFormReturn<Filters>;
  results?: SearchResultState;
  selectedHit?: SelectedHit;
};

export type SelectedHit = {
  path: string;
  line: number;
};

export type Filters = {
  query: string;
  file: string;
  excludeFile: string;
  caseInsensitive: boolean;
  numLinesBefore: number;
  numLinesAfter: number;
};

export type ActionData =
  | [ACTION.SET_FILTERS, Filters]
  | [
      | ACTION.SELECT_QUERY_INPUT
      | ACTION.SELECT_FILE_INPUT
      | ACTION.SELECT_EXCLUDE_FILE_INPUT
      | ACTION.TOGGLE_CASE_INSENSITIVE
      | ACTION.SELECT_PREVIOUS
      | ACTION.SELECT_NEXT,
    ]
  | [ACTION.SET_SELECTED_HIT, SelectedHit]
  | [ACTION.SET_SEARCH_RESULTS, SearchResultState];

export { SearchContextProvider, useSearchContext, dispatch } from './provider';
