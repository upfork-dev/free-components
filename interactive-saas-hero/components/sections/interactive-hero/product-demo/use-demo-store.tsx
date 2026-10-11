"use client";

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { DEFAULT_STATE, type DemoState, type PublishState } from "./demo-types";

/** The design settings that undo and redo walk through (publishing is not a design change). */
export type Design = Omit<DemoState, "publishState">;

type Store = { state: DemoState; past: Design[]; future: Design[] };

export type DemoAction =
  /** A change: recorded in history unless `record` is false (slider drags in progress, the tour). */
  | { type: "set"; patch: Partial<Design>; record?: boolean }
  /** The end of a slider drag: one history entry for the whole drag, from the value it started at. */
  | { type: "commit"; before: Design }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "publish"; phase: PublishState };

/** The design part of the state (everything but publishing). */
export function designOf(state: DemoState): Design {
  const design: Partial<DemoState> = { ...state };
  delete design.publishState;
  return design as Design;
}
const same = (a: Design, b: Design) => (Object.keys(a) as (keyof Design)[]).every((k) => a[k] === b[k]);
const HISTORY_LIMIT = 50;

function reducer(store: Store, action: DemoAction): Store {
  const { state, past, future } = store;
  switch (action.type) {
    case "set": {
      const next = { ...state, ...action.patch };
      if (same(designOf(next), designOf(state))) return store;
      if (action.record === false) return { ...store, state: next };
      return { state: next, past: [...past, designOf(state)].slice(-HISTORY_LIMIT), future: [] };
    }
    case "commit":
      if (same(action.before, designOf(state))) return store;
      return { state, past: [...past, action.before].slice(-HISTORY_LIMIT), future: [] };
    case "undo": {
      const previous = past[past.length - 1];
      if (!previous) return store;
      return { state: { ...state, ...previous }, past: past.slice(0, -1), future: [designOf(state), ...future] };
    }
    case "redo": {
      const [next, ...rest] = future;
      if (!next) return store;
      return { state: { ...state, ...next }, past: [...past, designOf(state)], future: rest };
    }
    case "reset":
      return { ...store, state: { ...DEFAULT_STATE, publishState: state.publishState } };
    case "publish":
      return { ...store, state: { ...state, publishState: action.phase } };
  }
}

type DemoContextValue = {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  canUndo: boolean;
  canRedo: boolean;
  productName: string;
  projectName: string;
  enableCollaborators: boolean;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({
  productName,
  projectName,
  enableCollaborators = true,
  children,
}: {
  productName: string;
  projectName: string;
  enableCollaborators?: boolean;
  children: ReactNode;
}) {
  const [store, dispatch] = useReducer(reducer, { state: DEFAULT_STATE, past: [], future: [] });
  const value = useMemo(
    () => ({
      state: store.state,
      dispatch,
      canUndo: store.past.length > 0,
      canRedo: store.future.length > 0,
      productName,
      projectName,
      enableCollaborators,
    }),
    [store, productName, projectName, enableCollaborators],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside <DemoProvider>");
  return value;
}
