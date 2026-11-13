import type { Chapter } from "@/shared/schemas/chapter";

type Props = { chapter: Chapter; position: number; total: number };

/**
 * One chapter of the story. The text is the main source of information: it must read well with the map gone,
 * so nothing here depends on it.
 *
 * Desktop: a column on the left, the map visible beside it. Mobile: the card sits at the bottom of the
 * screen over a full-screen map.
 */
export function ChapterCard({ chapter, position, total }: Props) {
  const headingId = `${chapter.id}-title`;
  return (
    <section
      id={chapter.id}
      data-chapter={position - 1}
      data-map-type={chapter.map.type}
      aria-labelledby={headingId}
      className="flex min-h-dvh items-end px-4 pb-6 md:items-center md:px-8 md:pb-0"
    >
      <article className="w-full rounded-lg bg-white/90 p-6 shadow backdrop-blur md:max-w-md">
        <p className="text-sm font-medium text-neutral-600">
          Capítulo {position} de {total}
          {chapter.period ? ` · ${chapter.period}` : null}
        </p>
        <h2 id={headingId} className="mt-1 text-2xl font-semibold tracking-tight">
          {chapter.title}
        </h2>
        <p className="mt-3 leading-relaxed text-neutral-800">{chapter.body}</p>
      </article>
    </section>
  );
}
