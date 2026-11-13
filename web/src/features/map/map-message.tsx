import type { ReactNode } from "react";

type Props = { title: string; children?: ReactNode; action?: ReactNode };

/**
 * Notice for the states where there is no map to show. It is a strip at the top, above the story, not a
 * full-area panel: the text of the story is the main content and must stay readable without the map, so this
 * must never compete with the chapter cards for the middle of the screen.
 */
export function MapMessage({ title, children, action }: Props) {
  return (
    <div
      role="alert"
      className="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-neutral-300 bg-neutral-100 px-4 py-3 text-center text-sm"
    >
      <h2 className="font-semibold">{title}</h2>
      {children ? <p className="text-neutral-700">{children}</p> : null}
      {action}
    </div>
  );
}

/** Same footprint as the map, so nothing shifts when it replaces this. */
export function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando el mapa"
      className="absolute inset-0 z-10 animate-pulse bg-neutral-200"
    />
  );
}
