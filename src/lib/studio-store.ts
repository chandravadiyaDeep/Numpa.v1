import { useSyncExternalStore } from "react";
import type { Dataset, Step } from "./dataset";
import { runPipeline } from "./dataset";

interface State {
  dataset: Dataset | null;
  steps: Step[];
  processed: Dataset | null;
  target: string | null;
  past: Step[][];
  future: Step[][];
}

const empty: State = { dataset: null, steps: [], processed: null, target: null, past: [], future: [] };

let state: State = empty;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

/** Apply a steps mutation while recording it on the undo stack. */
const commit = (steps: Step[]) =>
  set({ steps, processed: null, past: [...state.past, state.steps], future: [] });

export const store = {
  setDataset(dataset: Dataset) {
    set({ ...empty, dataset });
  },
  clear() {
    set({ ...empty });
  },
  setTarget(target: string | null) {
    set({ target });
  },
  addStep(step: Step) {
    commit([...state.steps, step]);
  },
  updateStep(id: string, patch: Partial<Step>) {
    commit(state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  },
  removeStep(id: string) {
    commit(state.steps.filter((s) => s.id !== id));
  },
  move(id: string, dir: -1 | 1) {
    const steps = [...state.steps];
    const i = steps.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    commit(steps);
  },
  undo() {
    if (!state.past.length) return;
    const past = [...state.past];
    const steps = past.pop()!;
    set({ steps, past, future: [state.steps, ...state.future], processed: null });
  },
  redo() {
    if (!state.future.length) return;
    const [steps, ...future] = state.future;
    set({ steps, future, past: [...state.past, state.steps], processed: null });
  },
  /** Discard the whole pipeline and return to the raw upload. */
  reset() {
    if (!state.steps.length && !state.processed) return;
    set({ steps: [], processed: null, past: [...state.past, state.steps], future: [] });
  },
  run() {
    if (!state.dataset) return;
    set({ processed: runPipeline(state.dataset, state.steps) });
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStudio() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/** Dataset currently in effect: processed output when available, otherwise the raw upload. */
export function useActiveDataset() {
  const s = useStudio();
  return s.processed ?? s.dataset;
}

/* --------------------------- session persistence -------------------------- */

const KEY = "uda-studio-state";
let hydrated = false;

/** Restore the workspace after a page reload. Call once, client-side. */
export function hydrateStudio() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      if (parsed?.dataset) set({ ...empty, ...parsed, past: [], future: [] });
    }
  } catch {
    /* ignore corrupt state */
  }
  listeners.add(() => {
    try {
      const { dataset, steps, processed, target } = state;
      window.sessionStorage.setItem(KEY, JSON.stringify({ dataset, steps, processed, target }));
    } catch {
      /* quota exceeded — keep working in memory */
    }
  });
}
