import type { UseFormReturn } from 'react-hook-form';

// Without setting a string value the reducer fails with https://github.com/microsoft/TypeScript/issues/28102 :(
export enum ACTION {
  SET_SEARCH_RESULT = 'SET_SEARCH_RESULT',
  SET_FILE_RESULT = 'SET_FILE_RESULT',

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
export type LineMatch = { line: number; range: Range };
export type FileResult = FileHeader & {
  content: string;
  matches: LineMatch[];
};

type HttpResultState<T> = {
  loading: boolean;
  error?: { message: string };
  result?: T;
};
export type SelectedHit = FileHeader & {
  line: number;
};

export type State = {
  form: UseFormReturn<Filters>;
  searchResult?: HttpResultState<SearchResult>;
  fileResult?: HttpResultState<FileResult>;
  selectedHit?: SelectedHit;
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
  | [ACTION.SELECT_PREVIOUS | ACTION.SELECT_NEXT]
  | [ACTION.CALLBACK_SELECTED_HIT, (hit: SelectedHit) => void]
  | [ACTION.SET_SEARCH_RESULT, HttpResultState<SearchResult> | undefined]
  | [ACTION.SET_FILE_RESULT, HttpResultState<FileResult> | undefined];

export { SearchContextProvider, useSearchContext, dispatch } from './provider';
