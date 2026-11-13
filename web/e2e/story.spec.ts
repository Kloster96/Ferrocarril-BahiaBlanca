import { expect, test, type Page } from "@playwright/test";

// Scrolling past the end is clamped by the browser, so any value beyond the page height reaches the bottom.
const PAGE_BOTTOM = 1_000_000;

type State = { chapter: number; progress: number };
type Range = { start: number; end: number };

/** What StoryScroll exposes on the page: the active chapter (-1 is the hero) and its progress. */
async function state(page: Page): Promise<State> {
  const root = page.locator("[data-active-chapter]");
  return {
    chapter: Number(await root.getAttribute("data-active-chapter")),
    progress: Number(await root.getAttribute("data-chapter-progress")),
  };
}

const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo(0, top), y);

/**
 * Where each chapter starts and ends, measured from the layout instead of hard-coded: a chapter is active from
 * the moment its top crosses the middle of the screen until its bottom does. The last one ends where the page
 * does (see StoryScroll).
 */
async function chapterRanges(page: Page): Promise<Range[]> {
  return page.evaluate(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("section[data-chapter]")];
    return sections.map((section, index) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const bottom = top + section.offsetHeight;
      const last = index === sections.length - 1;
      return {
        start: top - window.innerHeight / 2,
        end: last ? bottom - window.innerHeight : bottom - window.innerHeight / 2,
      };
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The attribute is written by an effect: its presence means the scroll code is up.
  await page.locator("[data-active-chapter]").waitFor({ state: "attached" });
});

test("opens on the hero", async ({ page }) => {
  expect(await state(page)).toEqual({ chapter: -1, progress: 0 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("each chapter becomes the active one, in order, as the page scrolls", async ({ page }) => {
  const ranges = await chapterRanges(page);
  for (const [index, { start, end }] of ranges.entries()) {
    await scrollTo(page, (start + end) / 2);
    await expect.poll(async () => (await state(page)).chapter).toBe(index);
    expect((await state(page)).progress).toBeCloseTo(0.5, 1);
    // The active section is also announced to assistive technology.
    await expect(page.locator("section[aria-current='step']")).toHaveCount(1);
    await expect(page.locator(`section[data-chapter='${index}']`)).toHaveAttribute(
      "aria-current",
      "step",
    );
  }
});

test("progress inside a chapter only grows while scrolling down", async ({ page }) => {
  const [first] = await chapterRanges(page);
  const seen: number[] = [];
  for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    await scrollTo(page, first!.start + fraction * (first!.end - first!.start));
    await expect.poll(async () => (await state(page)).progress).toBeCloseTo(fraction, 1);
    seen.push((await state(page)).progress);
  }
  expect(seen).toEqual([...seen].sort((a, b) => a - b));
});

test("the last chapter completes at the end of the page", async ({ page }) => {
  const ranges = await chapterRanges(page);
  await scrollTo(page, PAGE_BOTTOM);
  await expect.poll(() => state(page)).toEqual({ chapter: ranges.length - 1, progress: 1 });
});

test("landing exactly on a chapter boundary never leaves a stale state", async ({ page }) => {
  // Regression: at the exact start or end a ScrollTrigger is not active, so the state used to keep an old value.
  const ranges = await chapterRanges(page);
  for (const [index, { end }] of ranges.slice(0, -1).entries()) {
    await scrollTo(page, 0); // jump from far away, like a reload that restores the scroll
    await scrollTo(page, Math.round(end));
    // Either the chapter just finished (progress 1) or the next one has just started: never the hero or a leftover.
    await expect
      .poll(async () => {
        const { chapter, progress } = await state(page);
        return (chapter === index && progress >= 0.99) || chapter === index + 1;
      })
      .toBe(true);
  }
});

test("scrolling back up returns to the hero", async ({ page }) => {
  const [first] = await chapterRanges(page);
  await scrollTo(page, first!.start + 50);
  await expect.poll(async () => (await state(page)).chapter).toBe(0);
  await scrollTo(page, 0);
  await expect.poll(() => state(page)).toEqual({ chapter: -1, progress: 0 });
});

test("the story reads without the map: every chapter has its title and text", async ({ page }) => {
  const sections = page.locator("section[data-chapter]");
  expect(await sections.count()).toBeGreaterThan(0);
  for (const section of await sections.all()) {
    await expect(section.getByRole("heading", { level: 2 })).not.toBeEmpty();
    await expect(section.locator("p").last()).not.toBeEmpty();
  }
});
