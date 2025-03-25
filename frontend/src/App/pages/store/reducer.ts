import type { ActionData, File, SelectedHit, State } from '.';
import { ACTION } from '.';

function* hitIterator(files: File[]): Generator<SelectedHit> {
  for (let file of files) {
    for (let line of file.lines ?? []) {
      if (line.range != null)
        yield {
          path: file.path,
          directory: file.directory,
          repository: file.repository,
          branch: file.branch,
          line: line.number,
        };
    }
  }
}

function selectNode(state: State, down: boolean): State {
  const files = state.searchResult?.result?.files;
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
    if (
      hit.path === selected.path &&
      hit.directory == selected.directory &&
      hit.line === selected.line
    ) {
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
  return result;
}

function _preReducer(state: State, [action, data]: ActionData): State {
  switch (action) {
    case ACTION.SELECT_PREVIOUS:
      return selectNode(state, false);
    case ACTION.SELECT_NEXT:
      return selectNode(state, true);

    case ACTION.SET_SEARCH_RESULT:
      return selectNode({ ...state, searchResult: data }, true);
    case ACTION.SET_FILE_RESULT: {
      const match = /^#L(\d+)$/.exec(window.location.hash);
      const selectedHit = data?.result
        ? {
            path: data.result.path,
            directory: data.result.directory,
            repository: data.result.repository,
            branch: data.result.branch,
            line: match ? parseInt(match[1], 10) : 0,
          }
        : undefined;
      return { ...state, fileResult: data, selectedHit };
    }
    case ACTION.CALLBACK_SELECTED_HIT:
      if (state.selectedHit) data(state.selectedHit);
      return state;

    default:
      throw new Error(`Unknown action ${action}`);
  }
}
