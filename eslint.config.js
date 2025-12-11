import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      "*.config.js",
      ".github/actions/*/dist/",
      "website/.astro/",
      "website/dist/",
    ],
  }
);
