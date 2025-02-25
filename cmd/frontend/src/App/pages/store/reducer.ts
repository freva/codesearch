import type { ActionData, File, SelectedHit, State } from '.';
import { ACTION } from '.';
import { isEqual } from 'lodash';

function* hitIterator(files: File[]): Generator<SelectedHit> {
  for (let file of files) {
    for (let line of file.lines ?? []) {
      if (line.range != null) yield { path: file.path, line: line.number };
    }
  }
}

function selectNode(state: State, down: boolean): State {
  const files = state.results?.results?.files;
  if (files == null || files.length === 0) {
    if (state.selectedHit == null) return state;
    return { ...state, selectedHit: undefined };
  }

  const selected = state.selectedHit;
  if (selected == null)
    return { ...state, selectedHit: hitIterator(files).next().value };

  let select = undefined;
  let prevHit = undefined;
  let stopAtNext = false;
  for (let hit of hitIterator(files)) {
    if (select == null) select = prevHit = hit;
    if (hit.path === selected.path && hit.line === selected.line) {
      if (!down) {
        select = prevHit;
        break;
      } else stopAtNext = true;
    } else if (stopAtNext) {
      select = hit;
      break;
    }
    prevHit = hit;
  }
  return { ...state, selectedHit: select };
}

export function reducer(state: State, actionData: ActionData): State {
  const result = _preReducer(state, actionData);
  return Object.freeze(_postReducer(state, result));
}

function _postReducer(state: State, result: State): State {
  if (state === result) return result; // Short circuit if pre-reducer produced no change
  if (state.results?.results !== result.results?.results)
    result = _preReducer(result, [ACTION.SELECT_NEXT]);
  return result;
}

function _preReducer(state: State, [action, data]: ActionData): State {
  switch (action) {
    case ACTION.SET_FILTERS:
      return isEqual(state.filters, data) ? state : { ...state, filters: data };
    case ACTION.SET_SELECTED_HIT:
      return { ...state, selectedHit: data };

    case ACTION.SELECT_PREVIOUS:
      return selectNode(state, false);
    case ACTION.SELECT_NEXT:
      return selectNode(state, true);

    case ACTION.SET_SEARCH_RESULTS:
      return { ...state, results: data };

    default:
      throw new Error(`Unknown action ${action}`);
  }
}
