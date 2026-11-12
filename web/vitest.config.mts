import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same `@/` alias as tsconfig.json, so app code that imports through it can be tested.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // data/ holds plain scripts with no test runner of its own: web/ runs their tests (see issue #16).
    include: ["src/**/*.test.ts", "../data/**/*.test.ts"],
    // The default reporter hides passing files. In CI, list them so the log proves data/ tests ran.
    // Outside CI the reporter is left untouched.
    ...(process.env.CI ? { reporters: ["verbose"] } : {}),
  },
});
