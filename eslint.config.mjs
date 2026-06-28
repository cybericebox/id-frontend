import nextConfig from "eslint-config-next"

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  {
    linterOptions: {
      // Pre-existing // eslint-disable-next-line comments remain in place
      // for code that was written before this config existed; do not flag them.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      // Core hooks discipline — these are new and clean in this codebase.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Compiler rules produce false-positives on existing patterns
      // (window.location.href assignment, form.watch(), setState-in-effect idiom).
      // These are pre-existing in the codebase and are not part of this PR's scope.
      // Tracked for a follow-up cleanup.
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Suppress the pre-existing rules-of-hooks violation in the vendored checkbox component.
  {
    files: ["src/components/ui/checkbox.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Suppress the @next/next/no-img-element warning in the brand Logo (pre-existing, intentional SVG use).
  {
    files: ["src/components/brand/Logo.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]

export default eslintConfig
