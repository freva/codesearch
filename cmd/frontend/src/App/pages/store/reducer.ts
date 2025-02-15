import type { ActionData, State } from '.';
import { ACTION } from '.';
import { isEqual } from 'lodash';

export function reducer(state: State, actionData: ActionData): State {
  const result = _preReducer(state, actionData);
  return Object.freeze(_postReducer(state, result));
}

function _postReducer(state: State, result: State): State {
  if (state === result) return result; // Short circuit if pre-reducer produced no change

  return result;
}

function _preReducer(state: State, [action, data]: ActionData): State {
  switch (action) {
    case ACTION.SET_FILTERS:
      return isEqual(state.filters, data) ? state : { ...state, filters: data };

    case ACTION.SET_SEARCH_RESULTS:
      return { ...state, results: data };

    default:
      throw new Error(`Unknown action ${action}`);
  }
}
