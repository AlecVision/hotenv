import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.ts"],
    coverage: {
      "100": true,
      reporter: ["html", "html-spa", "json-summary"],
      provider: "v8",
      reportsDirectory: "coverage",
      reportOnFailure: true,
    },
    typecheck: {
      checker: "tsc",
      include: ["src/**/*"]
    }
  },
  build: {
    commonjsOptions: {
      include: []
    }
  },
  optimizeDeps: {
    disabled: false
  }
});
