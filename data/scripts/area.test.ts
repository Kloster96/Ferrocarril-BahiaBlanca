import { describe, expect, it } from "vitest";
import {
  buildAreaFeatures,
  buildAreaQuery,
  buildOuterRings,
  signedArea,
  simplifyRings,
  type AreaRelation,
} from "./area.ts";

const way = (ref: number, coords: [number, number][], role = "outer") => ({
  type: "way",
  ref,
  role,
  geometry: coords.map(([lon, lat]) => ({ lon, lat })),
});

// Two unit squares side by side. Way 2 is the border they share.
//   (0,1)---(1,1)---(2,1)
//     |  A    |  B    |
//   (0,0)---(1,0)---(2,0)
const left: AreaRelation = {
  type: "relation",
  id: 1,
  members: [
    way(10, [
      [0, 0],
      [0, 1],
      [1, 1],
    ]),
    way(2, [
      [1, 1],
      [1, 0],
    ]),
    way(11, [
      [1, 0],
      [0, 0],
    ]),
  ],
};
const right: AreaRelation = {
  type: "relation",
  id: 2,
  members: [
    way(2, [
      [1, 0],
      [1, 1],
    ]), // same way, stored the other way round
    way(20, [
      [1, 1],
      [2, 1],
      [2, 0],
      [1, 0],
    ]),
  ],
};

describe("buildOuterRings", () => {
  it("drops the shared border and returns one outline around both partidos", () => {
    const rings = buildOuterRings([left, right]);
    expect(rings).toHaveLength(1);
    const ring = rings[0]!;
    expect(ring[0]).toEqual(ring.at(-1));
    // The union is a 2x1 rectangle: the shared border (x=1) must not appear as a vertex in the middle.
    expect(Math.abs(signedArea(ring))).toBe(2);
    expect(ring.filter(([lon, lat]) => lon === 1 && lat > 0 && lat < 1)).toHaveLength(0);
  });

  it("returns each separate partido as its own ring when nothing is shared", () => {
    expect(buildOuterRings([left])).toHaveLength(1);
    const far: AreaRelation = {
      type: "relation",
      id: 3,
      members: [
        way(30, [
          [5, 5],
          [6, 5],
          [6, 6],
          [5, 5],
        ]),
      ],
    };
    expect(buildOuterRings([left, far])).toHaveLength(2);
  });

  it("ignores inner members and non-way members", () => {
    const withExtras: AreaRelation = {
      ...left,
      members: [
        ...left.members,
        way(
          99,
          [
            [0, 0],
            [0.5, 0.5],
          ],
          "inner",
        ),
        { type: "node", ref: 5, role: "admin_centre" },
      ],
    };
    expect(buildOuterRings([withExtras])).toHaveLength(1);
  });

  it("fails loudly when the boundary does not close", () => {
    const open: AreaRelation = {
      type: "relation",
      id: 4,
      members: [
        way(40, [
          [0, 0],
          [1, 0],
          [1, 1],
        ]),
      ],
    };
    expect(() => buildOuterRings([open])).toThrow(/does not close/);
  });

  it("fails when a way has no geometry", () => {
    const broken: AreaRelation = {
      type: "relation",
      id: 5,
      members: [{ type: "way", ref: 7, role: "outer" }],
    };
    expect(() => buildOuterRings([broken])).toThrow(/no geometry/);
  });
});

describe("buildAreaFeatures", () => {
  const [area, mask] = buildAreaFeatures(buildOuterRings([left, right]));

  it("winds the area counter-clockwise and the mask holes clockwise (RFC 7946)", () => {
    expect(signedArea(area!.geometry.coordinates[0]![0]!)).toBeGreaterThan(0);
    const [world, ...holes] = mask!.geometry.coordinates;
    expect(signedArea(world!)).toBeGreaterThan(0);
    for (const hole of holes) expect(signedArea(hole)).toBeLessThan(0);
  });

  it("cuts one hole per area ring out of the world", () => {
    expect(mask!.geometry.coordinates).toHaveLength(2);
  });
});

describe("buildAreaQuery", () => {
  it("asks for the relations with geometry", () => {
    expect(buildAreaQuery([1, 2])).toContain("rel(id:1,2);\nout geom;");
  });
  it("rejects ids that are not plain positive integers", () => {
    expect(() => buildAreaQuery([1, -2])).toThrow(/Invalid OSM relation id/);
  });
});

describe("simplifyRings", () => {
  // A square with a bump of ~11 m on one side (0.0001° of latitude).
  const bumpy: [number, number][] = [
    [0, 0],
    [0.005, 0.0001],
    [0.01, 0],
    [0.01, 0.01],
    [0, 0.01],
    [0, 0],
  ];

  it("drops vertices inside the tolerance and keeps the corners", () => {
    const [ring] = simplifyRings([bumpy], 50);
    expect(ring).toHaveLength(5);
    expect(ring![0]).toEqual(ring!.at(-1));
  });

  it("keeps the vertices that stick out more than the tolerance", () => {
    expect(simplifyRings([bumpy], 1)[0]).toHaveLength(6);
  });

  it("drops rings that collapse, such as islets smaller than the tolerance", () => {
    const islet: [number, number][] = [
      [0, 0],
      [0.00001, 0],
      [0.00001, 0.00001],
      [0, 0],
    ];
    expect(simplifyRings([islet], 50)).toEqual([]);
  });
});
