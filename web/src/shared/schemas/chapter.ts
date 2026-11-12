import { z } from "zod";

/** Marker for any historical claim nobody has confirmed yet. Luciano verifies and replaces it. */
export const TODO_VERIFY = "TODO(verify)";

const text = z.string().trim().min(1);

export const chapterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be lowercase kebab-case"),
    title: text,
    body: text,
    /** Free text on purpose: historical periods are often approximate ("décadas de 1880"). */
    period: text.nullable(),
    /** Where the facts come from. `null` until someone provides it. */
    source: text.nullable(),
    verified: z.boolean(),
  })
  // `verified` is a promise to the reader: it cannot be true without a source or with pending markers.
  .refine((chapter) => !chapter.verified || chapter.source !== null, {
    message: "A verified chapter needs a source",
    path: ["source"],
  })
  .refine(
    (chapter) =>
      !chapter.verified ||
      ![chapter.title, chapter.body, chapter.period ?? ""].some((value) =>
        value.includes(TODO_VERIFY),
      ),
    { message: `A verified chapter cannot contain ${TODO_VERIFY}`, path: ["verified"] },
  );

export const chaptersSchema = z
  .array(chapterSchema)
  .min(1)
  .refine((chapters) => new Set(chapters.map((c) => c.id)).size === chapters.length, {
    message: "Chapter ids must be unique",
  });

export type Chapter = z.infer<typeof chapterSchema>;
