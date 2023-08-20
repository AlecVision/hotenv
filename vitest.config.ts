import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.ts"],
    coverage: {
      thresholdAutoUpdate: true,
      statements: 89.44,
      branches: 90,
      functions: 66.66,
      lines: 89.44,
      reporter: ["html", "html-spa", "json-summary"],
      provider: "v8",
      reportsDirectory: "coverage",
      reportOnFailure: true,
    },
    typecheck: {
      tsconfig: "tsconfig.json",
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
