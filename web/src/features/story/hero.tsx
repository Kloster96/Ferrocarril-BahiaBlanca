/** First screen: title, a line of context and a quiet cue that the page scrolls. */
export function Hero() {
  return (
    <header className="flex min-h-dvh flex-col justify-between px-4 py-8 md:px-8">
      <div className="max-w-md rounded-lg bg-white/90 p-6 shadow backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">El ferrocarril en Bahía Blanca</h1>
        <p className="mt-3 text-neutral-700">
          Una historia que avanza con el scroll, sobre el mapa.
        </p>
      </div>
      <p className="self-center rounded bg-white/90 px-3 py-1 text-sm text-neutral-700 shadow">
        Deslizá para empezar
      </p>
    </header>
  );
}
