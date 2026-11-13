import type { Chapter } from "@/shared/schemas/chapter";
import { clamp01, routeProgress, type ChapterProgress } from "./progress";

export type MapChapter = Pick<Chapter, "id" | "map">;

/** How one route looks: how much of the line is drawn (0..1) and how opaque it is. */
export type RouteLook = { drawn: number; opacity: number };

/** Earlier routes stay on screen but step back, so the active chapter is what the eye lands on. */
export const DIMMED_OPACITY = 0.35;

const NOT_REACHED_ANIMATED: RouteLook = { drawn: 0, opacity: 1 };
// Reduced motion draws nothing along the scroll: a route is whole and appears by fading in, so "hidden" is
// a whole line at opacity 0 and not an undrawn line.
const NOT_REACHED_REDUCED: RouteLook = { drawn: 1, opacity: 0 };
// A route that was drawn and has to go away (a status chapter) fades out; it is not un-drawn backwards.
const FADED_OUT: RouteLook = { drawn: 1, opacity: 0 };

/**
 * What every route looks like for the active chapter (rules decided by Luciano):
 * - Only `route` chapters have a route, and only they are drawn progressively.
 * - A route whose chapter has not been reached is hidden (also on the hero).
 * - The route of the active chapter follows the scroll; with reduced motion it is whole.
 * - Earlier routes stay drawn: at full strength while the active chapter is another route, dimmed in `zone` and
 *   `network` chapters, and hidden in `status` chapters, so the emphasis by status reads on its own.
 */
export function routeLooks(
  chapters: readonly MapChapter[],
  active: ChapterProgress,
  reducedMotion: boolean,
): Map<string, RouteLook> {
  const activeType = chapters[active.index]?.map.type;
  const notReached = reducedMotion ? NOT_REACHED_REDUCED : NOT_REACHED_ANIMATED;
  const looks = new Map<string, RouteLook>();

  chapters.forEach((chapter, index) => {
    if (chapter.map.type !== "route") return;
    if (activeType === undefined || index > active.index) {
      looks.set(chapter.id, notReached);
    } else if (activeType === "status") {
      looks.set(chapter.id, FADED_OUT);
    } else if (index === active.index) {
      looks.set(chapter.id, {
        drawn: reducedMotion ? 1 : clamp01(routeProgress(index, active)),
        opacity: 1,
      });
    } else {
      looks.set(chapter.id, {
        drawn: 1,
        opacity: activeType === "route" ? 1 : DIMMED_OPACITY,
      });
    }
  });
  return looks;
}

/**
 * The stations to highlight for the active chapter: those of its zone when it is a `zone` chapter, none in any
 * other chapter (and none on the hero). `zones` maps a chapter id to the OSM ids of its stations.
 */
export function highlightedStations(
  chapters: readonly MapChapter[],
  activeIndex: number,
  zones: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const chapter = chapters[activeIndex];
  if (chapter?.map.type !== "zone") return [];
  return zones.get(chapter.id) ?? [];
}
