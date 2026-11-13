import { describe, expect, it } from "vitest";
import { cameraFor } from "./camera.ts";

describe("cameraFor", () => {
  it("centres on the middle of the bounding box", () => {
    const { center } = cameraFor([
      [-62, -38],
      [-61, -37],
    ]);
    expect(center).toEqual([-61.5, -37.5]);
  });

  it("zooms out for a longer route and in for a shorter one", () => {
    const long = cameraFor([
      [-62.6, -38.9],
      [-61.7, -38.1],
    ]);
    const short = cameraFor([
      [-62.2, -38.5],
      [-62.15, -38.47],
    ]);
    expect(short.zoom).toBeGreaterThan(long.zoom);
  });

  it("fits the box: at the returned zoom it takes no more than the reference size on screen", () => {
    const { zoom } = cameraFor([
      [-62.6, -38.9],
      [-61.7, -38.9],
    ]);
    const widthPx = (0.9 / 360) * 512 * 2 ** zoom;
    expect(widthPx).toBeLessThanOrEqual(340);
    // ...and not by a lot: rounding to a tenth costs at most about 7% of the size.
    expect(widthPx).toBeGreaterThan(340 * 0.9);
  });

  it("measures latitude in Web Mercator: a tall box needs a lower zoom than the same degrees of longitude", () => {
    const wide = cameraFor([
      [-62, -38],
      [-61, -38],
    ]);
    const tall = cameraFor([
      [-62, -38],
      [-62, -37],
    ]);
    expect(tall.zoom).toBeLessThan(wide.zoom);
  });

  it("clamps a single point to the closest zoom instead of dividing by zero", () => {
    expect(cameraFor([[-62, -38]]).zoom).toBe(14);
  });

  it("fails on an empty route", () => {
    expect(() => cameraFor([])).toThrow(/at least one/);
  });
});

describe("cameraFor with a maximum zoom", () => {
  it("never gets closer than the cap, even for a lone point", () => {
    expect(cameraFor([[-62, -38]], 12.5).zoom).toBe(12.5);
  });

  it("caps a small box too, but leaves a big box alone", () => {
    const small = cameraFor(
      [
        [-62.1, -38.88],
        [-62.09, -38.89],
      ],
      12.5,
    );
    const big = cameraFor(
      [
        [-62.6, -38.9],
        [-61.7, -38.1],
      ],
      12.5,
    );
    expect(small.zoom).toBe(12.5);
    expect(big.zoom).toBeLessThan(12.5);
    expect(big.zoom).toBe(
      cameraFor([
        [-62.6, -38.9],
        [-61.7, -38.1],
      ]).zoom,
    );
  });
});
