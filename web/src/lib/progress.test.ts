import { describe, expect, it } from "vitest";
import { chapterProgress, clamp01, routeProgress, trimOffset } from "./progress";

describe("clamp01", () => {
  it("keeps values inside 0..1 and clamps the rest", () => {
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(7)).toBe(1);
  });

  it("treats non-finite input as 0", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
  });
});

describe("chapterProgress", () => {
  it("splits the story into equal slices", () => {
    expect(chapterProgress(0, 4)).toEqual({ index: 0, progress: 0 });
    expect(chapterProgress(0.125, 4)).toEqual({ index: 0, progress: 0.5 });
    expect(chapterProgress(0.5, 4)).toEqual({ index: 2, progress: 0 });
    expect(chapterProgress(0.875, 4)).toEqual({ index: 3, progress: 0.5 });
  });

  it("keeps the last chapter active and complete at exactly 1", () => {
    expect(chapterProgress(1, 3)).toEqual({ index: 2, progress: 1 });
  });

  it("clamps out-of-range and NaN input", () => {
    expect(chapterProgress(-0.5, 3)).toEqual({ index: 0, progress: 0 });
    expect(chapterProgress(2, 3)).toEqual({ index: 2, progress: 1 });
    expect(chapterProgress(NaN, 3)).toEqual({ index: 0, progress: 0 });
  });

  it("works with a single chapter", () => {
    expect(chapterProgress(0.25, 1)).toEqual({ index: 0, progress: 0.25 });
    expect(chapterProgress(1, 1)).toEqual({ index: 0, progress: 1 });
  });

  it("rejects a count that is not a positive integer", () => {
    expect(() => chapterProgress(0.5, 0)).toThrow(RangeError);
    expect(() => chapterProgress(0.5, -1)).toThrow(RangeError);
    expect(() => chapterProgress(0.5, 2.5)).toThrow(RangeError);
  });
});

describe("routeProgress", () => {
  const active = { index: 1, progress: 0.3 };

  it("keeps earlier routes drawn, leaves later ones untouched and follows the active one", () => {
    expect(routeProgress(0, active)).toBe(1);
    expect(routeProgress(1, active)).toBe(0.3);
    expect(routeProgress(2, active)).toBe(0);
  });

  it("clamps a bad progress on the active chapter", () => {
    expect(routeProgress(1, { index: 1, progress: 4 })).toBe(1);
    expect(routeProgress(1, { index: 1, progress: NaN })).toBe(0);
  });
});

describe("trimOffset", () => {
  it("hides from the progress to the end, as line-trim-offset expects", () => {
    expect(trimOffset(0)).toEqual([0, 1]); // everything hidden
    expect(trimOffset(0.25)).toEqual([0.25, 1]);
  });

  it("at 1 the hidden part is empty: start and end meet", () => {
    expect(trimOffset(1)).toEqual([1, 1]);
  });

  it("clamps its input", () => {
    expect(trimOffset(-1)).toEqual([0, 1]);
    expect(trimOffset(9)).toEqual([1, 1]);
  });
});
