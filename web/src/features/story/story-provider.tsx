"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createStoryStore, HERO, type StoryStore } from "./story-store";

const StoryContext = createContext<StoryStore | null>(null);

/** Creates one store per page and shares it between the scroll code and the map. */
export function StoryProvider({ children }: { children: ReactNode }) {
  // Lazy initial state: created once, never during a re-render.
  const [store] = useState(createStoryStore);
  return <StoryContext value={store}>{children}</StoryContext>;
}

export function useStoryStore(): StoryStore {
  const store = useContext(StoryContext);
  if (!store) throw new Error("useStoryStore must be used inside <StoryProvider>.");
  return store;
}

/** The active chapter index, as React state. Re-renders only when the chapter changes, not on every frame. */
export function useActiveChapter(): number {
  const store = useStoryStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.get().index,
    () => HERO.index,
  );
}
