import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "El ferrocarril en Bahía Blanca",
  description: "Una historia con scroll sobre el ferrocarril en Bahía Blanca, con mapa interactivo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
