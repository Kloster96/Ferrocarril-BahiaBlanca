"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type ReactNode } from "react";
import type { ChapterProgress } from "@/lib/progress";
import { HERO } from "./story-store";
import { useStoryStore } from "./story-provider";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the hero and the chapter cards and turns their scroll position into the store's state.
 *
 * One ScrollTrigger per chapter. A chapter is active from the moment its top crosses the middle of the screen
 * until its bottom does, and its progress goes 0..1 over that stretch. The last chapter is the exception: the
 * page ends before its bottom can reach the middle, so it runs until its bottom reaches the bottom of the
 * screen, which is where the page stops. Otherwise its progress would top out at about 0.5.
 *
 * The DOM is only read (data-chapter) and annotated (aria-current, data-active-chapter and
 * data-chapter-progress), never re-rendered: the cards stay Server Components.
 */
export function StoryScroll({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const store = useStoryStore();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const sections = [...element.querySelectorAll<HTMLElement>("section[data-chapter]")];

    const mark = ({ index, progress }: ChapterProgress) => {
      element.dataset.activeChapter = String(index);
      element.dataset.chapterProgress = progress.toFixed(3);
      sections.forEach((section, i) => {
        if (i === index) section.setAttribute("aria-current", "step");
        else section.removeAttribute("aria-current");
      });
    };
    mark(HERO);
    const unsubscribe = store.subscribe(() => mark(store.get()));

    // A context collects every trigger so one revert() removes them all, including on Strict Mode's double mount.
    const context = gsap.context(() => {
      sections.forEach((section, index) => {
        const isLast = index === sections.length - 1;
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: isLast ? "bottom bottom" : "bottom center",
          onUpdate: (self) => {
            if (self.isActive) store.set({ index, progress: self.progress });
          },
          // At its exact end a trigger is no longer "active", so the guard above drops the final update. Leaving a
          // chapter downwards means it is complete: say so. If the next chapter has already started, its own
          // update comes right after (triggers run in scroll order) and takes over; if the scroll lands exactly
          // on the boundary, or the page ends here (the last chapter), this is the state that stays.
          onLeave: () => store.set({ index, progress: 1 }),
          // The mirror image, scrolling up: leaving a chapter upwards puts the previous one at its end, or the hero
          // before the first chapter.
          onLeaveBack: () => store.set(index === 0 ? HERO : { index: index - 1, progress: 1 }),
        });
      });
    }, element);

    return () => {
      unsubscribe();
      context.revert();
      store.set(HERO);
    };
  }, [store]);

  return <div ref={root}>{children}</div>;
}
