import type { UseFormReturn } from 'react-hook-form';

// Without setting a string value the reducer fails with https://github.com/microsoft/TypeScript/issues/28102 :(
export enum ACTION {
  SET_FILTERS = 'SET_FILTERS',
  SET_SELECTED_HIT = 'SET_SELECTED_HIT',
  SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS',

  SELECT_PREVIOUS = 'SELECT_PREVIOUS',
  SELECT_NEXT = 'SELECT_NEXT',
  CALLBACK_SELECTED_HIT = 'CALLBACK_SELECTED_HIT',
}

export type Range = [number, number];
export type Line = { line: string; number: number; range?: Range };
export type FileHeader = {
  path: string;
  directory: string;
  repository: string;
  branch: string;
  range?: Range;
};
export type File = FileHeader & {
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

export type SelectedHit = FileHeader & {
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
  | [ACTION.SELECT_PREVIOUS | ACTION.SELECT_NEXT]
  | [ACTION.SET_SELECTED_HIT, SelectedHit]
  | [ACTION.CALLBACK_SELECTED_HIT, (hit: SelectedHit) => void]
  | [ACTION.SET_SEARCH_RESULTS, SearchResultState];

export { SearchContextProvider, useSearchContext, dispatch } from './provider';
