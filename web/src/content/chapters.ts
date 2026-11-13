// Story content (in Spanish). Nothing here is a confirmed historical fact yet: every unconfirmed claim is a
// TODO(verify) placeholder, and `verified` stays false until Luciano checks the source.
// The array is parsed at import time, so invalid content fails the build instead of reaching production.
//
// The seven titles are the TOPICS of the story, decided by Luciano. They say what each chapter is about, not
// what happened: the text of every chapter is still a placeholder until the research is verified.
import { chaptersSchema } from "../shared/schemas/chapter";

const topics = [
  "La llegada del tren (Ferrocarril del Sud)",
  "El puerto de Ingeniero White",
  "Las compañías que competían",
  "Punta Alta y Puerto Belgrano",
  "La nacionalización",
  "El cierre de ramales",
  "Hoy",
] as const;

export const chapters = chaptersSchema.parse(
  topics.map((title, index) => ({
    id: `chapter-${index + 1}`,
    title,
    body: `TODO(verify): texto del capítulo ${index + 1}.`,
    period: null,
    source: null,
    verified: false,
  })),
);
