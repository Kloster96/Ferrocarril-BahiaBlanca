// Story content (in Spanish). Nothing here is a confirmed historical fact yet: every unconfirmed claim is a
// TODO(verify) placeholder, and `verified` stays false until Luciano checks the source.
// The array is parsed at import time, so invalid content fails the build instead of reaching production.
// The number of chapters is a placeholder too: the real outline comes with the research.
import { chaptersSchema } from "../shared/schemas/chapter";

export const chapters = chaptersSchema.parse([
  {
    id: "chapter-1",
    title: "TODO(verify): título del capítulo 1",
    body: "TODO(verify): texto del capítulo 1.",
    period: null,
    source: null,
    verified: false,
  },
  {
    id: "chapter-2",
    title: "TODO(verify): título del capítulo 2",
    body: "TODO(verify): texto del capítulo 2.",
    period: null,
    source: null,
    verified: false,
  },
  {
    id: "chapter-3",
    title: "TODO(verify): título del capítulo 3",
    body: "TODO(verify): texto del capítulo 3.",
    period: null,
    source: null,
    verified: false,
  },
]);
