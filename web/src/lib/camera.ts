export type CameraTarget = { center: [number, number]; zoom: number };
export type CameraPadding = { top: number; right: number; bottom: number; left: number };

/**
 * The camera for the active chapter. Before the first chapter (`index` -1) and for an index with no route,
 * it falls back to the opening view, so the map never keeps a stale destination.
 */
export function pickCamera(
  index: number,
  chapterIds: readonly string[],
  cameras: ReadonlyMap<string, CameraTarget>,
  fallback: CameraTarget,
): CameraTarget {
  const id = chapterIds[index];
  return (id !== undefined ? cameras.get(id) : undefined) ?? fallback;
}

// Matches the layout in features/story: from `md` (768 px) the card is a column on the left.
const DESKTOP_MIN_WIDTH = 768;
// `max-w-md` (448 px) plus the card's side padding (32 px) on each side of the column.
const CARD_COLUMN = 480;
// On a phone the card is at the bottom; this is the share of the screen it usually covers.
const CARD_SHARE_MOBILE = 0.4;

/**
 * Mapbox `padding` for flyTo: it moves the centre of the camera to the middle of what is NOT covered, so the
 * route lands beside the card instead of under it. No geometry: just how much of the screen the card takes.
 */
export function cameraPadding(width: number, height: number): CameraPadding {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  if (width >= DESKTOP_MIN_WIDTH) return { ...none, left: Math.min(CARD_COLUMN, width / 2) };
  return { ...none, bottom: Math.round(height * CARD_SHARE_MOBILE) };
}
