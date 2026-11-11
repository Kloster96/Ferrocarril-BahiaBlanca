import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // data/ holds plain scripts with no test runner of its own: web/ runs their tests (see issue #16).
    include: ["src/**/*.test.ts", "../data/**/*.test.ts"],
  },
});
