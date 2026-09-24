import js from "@eslint/js"
import eslintReact from "@eslint-react/eslint-plugin"
import nextPlugin from "@next/eslint-plugin-next"
import globals from "globals"
import tseslint from "typescript-eslint"

// ESLint 10 flat config. eslint-config-next is not used: its bundled plugins
// (eslint-plugin-react / import / jsx-a11y) still cap at ESLint 9.
// typescript-eslint needs the TS 6 API — `typescript` is aliased to
// @typescript/typescript6, TS 7 lives in @typescript/native (see package.json).

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = tseslint.config(
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...eslintReact.configs["recommended-typescript"],
  },
  nextPlugin.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: {
      // Pre-existing // eslint-disable-next-line comments remain in place
      // for code that was written before this config existed; do not flag them.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      // setState-in-effect idiom is pre-existing (data loading in effects).
      // Tracked for a follow-up cleanup.
      "@eslint-react/set-state-in-effect": "off",

      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Suppress the @next/next/no-img-element warning in the brand Logo (pre-existing, intentional SVG use).
  {
    files: ["src/components/brand/Logo.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
)

export default eslintConfig
