import { describe, expect, it } from "vitest";
import { chapters } from "../../content/chapters";
import { chapterSchema, chaptersSchema, TODO_VERIFY } from "./chapter";

const valid = {
  id: "chapter-1",
  title: "Título",
  body: "Texto",
  period: null,
  source: null,
  verified: false,
  map: { type: "network" },
};

describe("chapter map types", () => {
  it("accepts the four types", () => {
    for (const map of [
      { type: "route" },
      { type: "zone" },
      { type: "network" },
      { type: "status", statuses: ["disused", "abandoned"] },
    ]) {
      expect(chapterSchema.safeParse({ ...valid, map }).success).toBe(true);
    }
  });

  it("requires at least one status in a status chapter", () => {
    expect(
      chapterSchema.safeParse({ ...valid, map: { type: "status", statuses: [] } }).success,
    ).toBe(false);
    expect(chapterSchema.safeParse({ ...valid, map: { type: "status" } }).success).toBe(false);
  });

  it("rejects an unknown type, an unknown status and extra fields", () => {
    expect(chapterSchema.safeParse({ ...valid, map: { type: "heatmap" } }).success).toBe(false);
    expect(
      chapterSchema.safeParse({ ...valid, map: { type: "status", statuses: ["closed"] } }).success,
    ).toBe(false);
    expect(
      chapterSchema.safeParse({ ...valid, map: { type: "route", statuses: ["active"] } }).success,
    ).toBe(false);
  });

  it("requires a map type on every chapter", () => {
    const withoutMap = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== "map"));
    expect(chapterSchema.safeParse(withoutMap).success).toBe(false);
  });
});

describe("chapterSchema", () => {
  it("accepts an unverified chapter without source", () => {
    expect(chapterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a verified chapter without a source", () => {
    const result = chapterSchema.safeParse({ ...valid, verified: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["source"]);
  });

  it("rejects a verified chapter that still has a pending marker", () => {
    const result = chapterSchema.safeParse({
      ...valid,
      verified: true,
      source: "Archivo X",
      body: `${TODO_VERIFY}: fecha`,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a verified chapter with a source and no markers", () => {
    expect(chapterSchema.safeParse({ ...valid, verified: true, source: "Archivo X" }).success).toBe(
      true,
    );
  });

  it("rejects empty text and ids that are not kebab-case", () => {
    expect(chapterSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(chapterSchema.safeParse({ ...valid, id: "Chapter 1" }).success).toBe(false);
  });
});

describe("chaptersSchema", () => {
  it("rejects an empty list and duplicated ids", () => {
    expect(chaptersSchema.safeParse([]).success).toBe(false);
    expect(chaptersSchema.safeParse([valid, valid]).success).toBe(false);
  });
});

describe("content/chapters", () => {
  it("parses, and nothing is marked verified while placeholders remain", () => {
    expect(chapters.length).toBeGreaterThan(0);
    for (const chapter of chapters) {
      const hasPlaceholder = [chapter.title, chapter.body].some((v) => v.includes(TODO_VERIFY));
      expect(chapter.verified && hasPlaceholder).toBe(false);
    }
  });
});
