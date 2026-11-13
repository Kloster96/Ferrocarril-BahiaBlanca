// Story content (in Spanish). Nothing here is a confirmed historical fact yet: every unconfirmed claim is a
// TODO(verify) placeholder, and `verified` stays false until Luciano checks the source.
// The array is parsed at import time, so invalid content fails the build instead of reaching production.
//
// The seven titles are the TOPICS of the story, decided by Luciano. They say what each chapter is about, not
// what happened: the text of every chapter is still a placeholder until the research is verified.
//
// `map` is what the map does in each chapter. The assignment follows what the map can show today, not the
// history; it is Luciano's to correct once the research exists. Chapter 3 in particular is PROVISIONAL: it
// will probably highlight the stations of different companies, which needs the curated layer (see CLAUDE.md).
import type { ChapterMap } from "../shared/schemas/chapter";
import { chaptersSchema } from "../shared/schemas/chapter";

const topics: { title: string; map: ChapterMap }[] = [
  { title: "La llegada del tren (Ferrocarril del Sud)", map: { type: "route" } },
  { title: "El puerto de Ingeniero White", map: { type: "zone" } },
  { title: "Las compañías que competían", map: { type: "network" } },
  { title: "Punta Alta y Puerto Belgrano", map: { type: "zone" } },
  { title: "La nacionalización", map: { type: "network" } },
  { title: "El cierre de ramales", map: { type: "status", statuses: ["disused", "abandoned"] } },
  { title: "Hoy", map: { type: "status", statuses: ["active"] } },
];

export const chapters = chaptersSchema.parse(
  topics.map(({ title, map }, index) => ({
    id: `chapter-${index + 1}`,
    title,
    body: `TODO(verify): texto del capítulo ${index + 1}.`,
    period: null,
    source: null,
    verified: false,
    map,
  })),
);
