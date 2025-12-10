import type { Context, Dispatch } from 'react';
import type { ActionData, State } from '.';
import { createContext, useContextSelector } from 'use-context-selector';

export const internal = {
  context: createContext<State | undefined>(undefined),
  searchContextDispatchRef: undefined as Dispatch<ActionData> | undefined,
};

export function useSearchContext<T>(selector: (s: State) => T): T {
  return useContextSelector(internal.context as Context<State>, selector);
}

export function dispatch(actionData: ActionData): void {
  if (!internal.searchContextDispatchRef) throw new Error('Search context dispatch not set');
  internal.searchContextDispatchRef(actionData);
}
