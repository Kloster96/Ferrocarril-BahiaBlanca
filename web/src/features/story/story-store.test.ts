import { describe, expect, it, vi } from "vitest";
import { createStoryStore, HERO } from "./story-store";

describe("createStoryStore", () => {
  it("starts on the hero", () => {
    expect(createStoryStore().get()).toEqual(HERO);
  });

  it("notifies subscribers with the new state", () => {
    const store = createStoryStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ index: 1, progress: 0.4 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ index: 1, progress: 0.4 });
  });

  it("does not notify when nothing changed", () => {
    const store = createStoryStore();
    store.set({ index: 0, progress: 0.5 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ index: 0, progress: 0.5 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("clamps the progress", () => {
    const store = createStoryStore();
    store.set({ index: 0, progress: 7 });
    expect(store.get().progress).toBe(1);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStoryStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ index: 2, progress: 0.1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("tolerates a listener that unsubscribes while being notified", () => {
    const store = createStoryStore();
    const second = vi.fn();
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);
    store.set({ index: 0, progress: 0.2 });
    expect(second).toHaveBeenCalledTimes(1);
  });
});
