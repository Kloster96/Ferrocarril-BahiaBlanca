import { chapters } from "@/content/chapters";
import { MapLoader } from "@/features/map/map-loader";
import { ChapterCard } from "@/features/story/chapter-card";
import { Hero } from "@/features/story/hero";

export default function HomePage() {
  return (
    <main>
      {/* The map is fixed to the viewport for the whole story. The text layer below is pulled up over it
          with a negative margin, so the page is exactly as tall as the text and the map just stays put. */}
      <div className="sticky top-0 h-dvh">
        <MapLoader />
      </div>
      {/* z-20 over the whole map on purpose: while the story runs the map takes no gestures, so a swipe
          scrolls the page and the wheel never zooms the map by accident. */}
      <div className="relative z-20 -mt-[100dvh]">
        <Hero />
        {chapters.map((chapter, index) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            position={index + 1}
            total={chapters.length}
          />
        ))}
      </div>
    </main>
  );
}
