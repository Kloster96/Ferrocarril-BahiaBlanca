import { notFound } from "next/navigation";

// Throwaway experiment for issue #23. It must not exist in production: with the literal NODE_ENV check the
// bundler drops the else branch, and with it the import of the lab (verified by grepping the build output).
export default async function LineTrimPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  } else {
    const { LineTrimLab } = await import("./line-trim-lab");
    return <LineTrimLab />;
  }
}
