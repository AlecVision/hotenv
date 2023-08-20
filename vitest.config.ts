import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.ts"],
    passWithNoTests: true,
    coverage: {
      thresholdAutoUpdate: true,
      statements: 89.91,
      branches: 88.4,
      functions: 66.66,
      lines: 89.91,
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
