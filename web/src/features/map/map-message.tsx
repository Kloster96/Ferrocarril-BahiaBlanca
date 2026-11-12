import type { ReactNode } from "react";

type Props = { title: string; children?: ReactNode; action?: ReactNode };

/** Full-area message for the states where there is no map to show: the text is the fallback. */
export function MapMessage({ title, children, action }: Props) {
  return (
    <div
      role="alert"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-100 p-8 text-center"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <p className="max-w-md text-neutral-700">{children}</p> : null}
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
