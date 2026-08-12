import { useSyncExternalStore } from "react";
import type { Dataset, Step } from "./dataset";
import { runPipelineAsync } from "./dataset";

interface State {
  dataset: Dataset | null;
  steps: Step[];
  processed: Dataset | null;
  target: string | null;
  past: Step[][];
  future: Step[][];
  /** True while a pipeline run is in flight (long runs no longer block the UI). */
  running: boolean;
  /** Completed steps / total steps for the current run. */
  progress: { done: number; total: number } | null;
  /** Set when a run fails or is cancelled. */
  runError: string | null;
}

const empty: State = {
  dataset: null,
  steps: [],
  processed: null,
  target: null,
  past: [],
  future: [],
  running: false,
  progress: null,
  runError: null,
};

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
    runController?.abort();
    runController = null;
    set({ ...empty, dataset });
  },
  clear() {
    runController?.abort();
    runController = null;
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
  /**
   * Execute the pipeline off the render path. Fire-and-forget for callers
   * (same call signature as before); progress and errors land in the store.
   */
  run() {
    if (!state.dataset || state.running) return;
    const controller = new AbortController();
    runController?.abort();
    runController = controller;
    const source = state.dataset;
    const steps = state.steps;
    set({ running: true, progress: { done: 0, total: steps.length }, runError: null });

    void runPipelineAsync(source, steps, {
      signal: controller.signal,
      onProgress: (done, total) => {
        if (runController === controller) set({ progress: { done, total } });
      },
    })
      .then((processed) => {
        if (runController !== controller) return;
        set({ processed, running: false, progress: null });
      })
      .catch((e: unknown) => {
        if (runController !== controller) return;
        const aborted = e instanceof DOMException && e.name === "AbortError";
        set({
          running: false,
          progress: null,
          runError: aborted
            ? null
            : e instanceof RangeError
              ? "This dataset is too large to transform in the browser. Try fewer steps or a smaller extract."
              : "The pipeline could not be completed.",
        });
      });
  },
  /** Abort an in-flight run and release its intermediate datasets. */
  cancelRun() {
    runController?.abort();
    runController = null;
    if (state.running) set({ running: false, progress: null, runError: null });
  },
};

let runController: AbortController | null = null;

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

/**
 * sessionStorage holds ~5 MB, so anything beyond a small dataset can never be
 * persisted anyway. Previously every single state change re-serialised the
 * entire dataset (a full JSON.stringify of every row, synchronously, on each
 * emit) only for the write to throw QuotaExceeded — the dominant source of
 * multi-second freezes on large files.
 *
 * Now: writes are debounced, skipped entirely once the row count exceeds what
 * storage can realistically take, and a size probe stops us stringifying data
 * that will be rejected.
 */
const PERSIST_MAX_ROWS = 20_000;
const PERSIST_MAX_CHARS = 3_500_000;

const persistable = (ds: Dataset | null) => !ds || ds.rows.length <= PERSIST_MAX_ROWS;

/** Restore the workspace after a page reload. Call once, client-side. */
export function hydrateStudio() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      if (parsed?.dataset)
        set({
          ...empty,
          ...parsed,
          past: [],
          future: [],
          running: false,
          progress: null,
          runError: null,
        });
    }
  } catch {
    /* ignore corrupt state */
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  listeners.add(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const { dataset, steps, processed, target, running } = state;
      if (running) return;
      try {
        if (!persistable(dataset) || !persistable(processed)) {
          // Too big to snapshot: keep the session key clean rather than
          // leaving a stale, mismatched dataset behind.
          window.sessionStorage.removeItem(KEY);
          return;
        }
        const payload = JSON.stringify({ dataset, steps, processed, target });
        if (payload.length > PERSIST_MAX_CHARS) {
          window.sessionStorage.removeItem(KEY);
          return;
        }
        window.sessionStorage.setItem(KEY, payload);
      } catch {
        /* quota exceeded — keep working in memory */
      }
    }, 400);
  });
}
