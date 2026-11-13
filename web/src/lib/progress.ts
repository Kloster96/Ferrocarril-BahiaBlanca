/**
 * Pure scroll-progress logic: no DOM, no GSAP, no Mapbox. The scroll code feeds numbers in and the map code
 * reads numbers out, so everything in between can be tested without a browser.
 */

/** Clamps to 0..1. A non-finite input (NaN, ±Infinity from a 0-height division) counts as 0. */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export type ChapterProgress = {
  /** Zero-based index of the active chapter. */
  index: number;
  /** How far through the active chapter we are, 0..1. */
  progress: number;
};

/**
 * Maps the progress of the whole story (0..1) onto equal slices, one per chapter.
 * At exactly 1 the last chapter is active and complete, rather than a non-existent chapter `count`.
 */
export function chapterProgress(globalProgress: number, count: number): ChapterProgress {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`count must be a positive integer, got ${count}`);
  }
  const scaled = clamp01(globalProgress) * count;
  const index = Math.min(count - 1, Math.floor(scaled));
  return { index, progress: scaled - index };
}

/**
 * How much of a chapter's route is drawn, 0..1, given the active chapter. Routes of earlier chapters stay fully
 * drawn, later ones are not started, and the active one follows the scroll. That is what makes the story
 * cumulative: the map keeps what the reader has already seen.
 */
export function routeProgress(routeIndex: number, active: ChapterProgress): number {
  if (routeIndex < active.index) return 1;
  if (routeIndex > active.index) return 0;
  return clamp01(active.progress);
}

/**
 * Value for Mapbox's `line-trim-offset`. Its `[start, end]` is the part of the line that is HIDDEN, so drawing a
 * route progressively means hiding from `progress` to the end: `[progress, 1]` (verified on mapbox-gl 3.34.2,
 * see CLAUDE.md). At 0 the whole line is hidden, at 1 none of it.
 */
export function trimOffset(progress: number): [number, number] {
  return [clamp01(progress), 1];
}

/**
 * Whether a chapter's route is shown at all when the reader asked for reduced motion. There is no scrub then:
 * a route is either hidden (its chapter has not been reached) or fully there, and it fades in instead of
 * being drawn along the scroll. Earlier chapters stay, like in the animated version.
 */
export function routeRevealed(routeIndex: number, activeIndex: number): boolean {
  return routeIndex <= activeIndex;
}
