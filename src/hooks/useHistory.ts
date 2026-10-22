import { useCallback, useReducer } from "react";
import { reduce, type Action, type Project } from "../core/project.ts";

const LIMIT = 100;

interface State {
  past: Project[];
  present: Project;
  future: Project[];
}

type HistoryAction = Action | { type: "undo" } | { type: "redo" };

function step(state: State, action: HistoryAction): State {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }
  if (action.type === "redo") {
    const [next, ...rest] = state.future;
    if (!next) return state;
    return {
      past: [...state.past, state.present],
      present: next,
      future: rest,
    };
  }
  const present = reduce(state.present, action);
  if (present === state.present) return state;
  // Loading a different class starts a fresh history.
  if (action.type === "load") return { past: [], present, future: [] };
  return {
    past: [...state.past, state.present].slice(-LIMIT),
    present,
    future: [],
  };
}

export function useHistory(initial: () => Project) {
  const [state, dispatch] = useReducer(step, undefined, () => ({
    past: [],
    present: initial(),
    future: [],
  }));
  const act = useCallback((action: HistoryAction) => dispatch(action), []);
  return {
    project: state.present,
    dispatch: act,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
