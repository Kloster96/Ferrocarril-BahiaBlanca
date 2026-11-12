import { describe, expect, it } from "vitest";
import { cameraPadding, pickCamera, type CameraTarget } from "./camera";

const opening: CameraTarget = { center: [0, 0], zoom: 5 };
const cameras = new Map<string, CameraTarget>([
  ["chapter-1", { center: [1, 1], zoom: 8 }],
  ["chapter-2", { center: [2, 2], zoom: 9 }],
]);
const ids = ["chapter-1", "chapter-2", "chapter-3"];

describe("pickCamera", () => {
  it("returns the camera of the chapter at that index", () => {
    expect(pickCamera(1, ids, cameras, opening)).toEqual({ center: [2, 2], zoom: 9 });
  });

  it("falls back to the opening view before the first chapter", () => {
    expect(pickCamera(-1, ids, cameras, opening)).toBe(opening);
  });

  it("falls back when the chapter has no route, or the index is out of range", () => {
    expect(pickCamera(2, ids, cameras, opening)).toBe(opening);
    expect(pickCamera(9, ids, cameras, opening)).toBe(opening);
  });
});

describe("cameraPadding", () => {
  it("leaves the card column free on the left on a desktop", () => {
    expect(cameraPadding(1280, 800)).toEqual({ top: 0, right: 0, bottom: 0, left: 480 });
  });

  it("never takes more than half the width", () => {
    expect(cameraPadding(768, 1024).left).toBe(384);
  });

  it("leaves the bottom free on a phone", () => {
    expect(cameraPadding(390, 844)).toEqual({ top: 0, right: 0, bottom: 338, left: 0 });
  });

  it("switches layout at the md breakpoint", () => {
    expect(cameraPadding(767, 800).left).toBe(0);
    expect(cameraPadding(768, 800).left).toBeGreaterThan(0);
  });
});
