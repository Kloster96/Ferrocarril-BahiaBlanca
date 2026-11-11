import { z } from "zod";

// Mapbox public tokens look like `pk.<payload>.<signature>` (base64url segments).
const PUBLIC_TOKEN = /^pk\.[\w-]+\.[\w-]+$/;

const tokenSchema = z
  .string()
  .trim()
  // Checked first so a secret token gets a specific message instead of a generic format error.
  .refine((value) => !value.startsWith("sk."), {
    message: "NEXT_PUBLIC_MAPBOX_TOKEN is a secret token (sk.). Use a public token (pk.).",
  })
  .refine((value) => PUBLIC_TOKEN.test(value), {
    message: "NEXT_PUBLIC_MAPBOX_TOKEN is not a valid Mapbox public token (expected pk.…).",
  });

export type MapboxTokenState = { status: "ok"; token: string } | { status: "missing" };

/**
 * A missing token is a valid state: the UI shows an explicit error instead of crashing.
 * A present-but-wrong token is a configuration mistake and throws, so it fails the build.
 *
 * Error messages never include the received value: a leaked `sk.` token must not end up in build logs.
 */
export function parseMapboxToken(raw: string | undefined): MapboxTokenState {
  if (raw === undefined || raw.trim() === "") {
    return { status: "missing" };
  }

  const result = tokenSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid NEXT_PUBLIC_MAPBOX_TOKEN.");
  }

  return { status: "ok", token: result.data };
}

// The property access must be literal: Next inlines NEXT_PUBLIC_* at build time only for `process.env.NAME`.
export const mapboxToken = parseMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
