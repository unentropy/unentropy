import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "unentropy-text-scripts",
      enforce: "pre",
      transform(code, id) {
        if (/\/src\/reporter\/templates\/default\/scripts\/[^/]+\.js$/.test(id))
          return { code: `export default ${JSON.stringify(code)};`, map: null };
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/setup/build-cli.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: { provider: "v8", reporter: ["text", "lcov"], reportsDirectory: "coverage" },
  },
});
