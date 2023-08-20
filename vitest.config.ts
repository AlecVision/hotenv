import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.ts"],
    passWithNoTests: true,
    coverage: {
      statements: 80,
      branches: 80,
      functions: 60,
      lines: 80,
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
