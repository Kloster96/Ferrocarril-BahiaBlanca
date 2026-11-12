import { clamp01, type ChapterProgress } from "@/lib/progress";

/** `index` is -1 while the hero is on screen: no chapter has started yet. */
export const HERO: ChapterProgress = { index: -1, progress: 0 };

export type StoryStore = {
  get: () => ChapterProgress;
  set: (next: ChapterProgress) => void;
  subscribe: (listener: () => void) => () => void;
};

/**
 * A tiny observable for the scroll position of the story.
 *
 * The progress changes on every scroll frame. Keeping it in React state would re-render the tree for each
 * pixel, so it lives here: the map subscribes imperatively and only the chapter index is exposed to React
 * (through useSyncExternalStore), which changes a handful of times per read.
 */
export function createStoryStore(): StoryStore {
  let state: ChapterProgress = HERO;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(next) {
      const progress = clamp01(next.progress);
      // Skip no-ops: scroll events fire more often than the value moves.
      if (next.index === state.index && progress === state.progress) return;
      state = { index: next.index, progress };
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
