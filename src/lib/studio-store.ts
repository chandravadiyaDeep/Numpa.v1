import { useSyncExternalStore } from "react";
import type { Dataset, Step } from "./dataset";
import { runPipeline } from "./dataset";

interface State {
  dataset: Dataset | null;
  steps: Step[];
  processed: Dataset | null;
}

let state: State = { dataset: null, steps: [], processed: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

export const store = {
  setDataset(dataset: Dataset) {
    set({ dataset, steps: [], processed: null });
  },
  clear() {
    set({ dataset: null, steps: [], processed: null });
  },
  addStep(step: Step) {
    set({ steps: [...state.steps, step], processed: null });
  },
  updateStep(id: string, patch: Partial<Step>) {
    set({ steps: state.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)), processed: null });
  },
  removeStep(id: string) {
    set({ steps: state.steps.filter((s) => s.id !== id), processed: null });
  },
  move(id: string, dir: -1 | 1) {
    const steps = [...state.steps];
    const i = steps.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    set({ steps, processed: null });
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
      const parsed = JSON.parse(raw) as State;
      if (parsed?.dataset) set(parsed);
    }
  } catch {
    /* ignore corrupt state */
  }
  listeners.add(() => {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — keep working in memory */
    }
  });
}
