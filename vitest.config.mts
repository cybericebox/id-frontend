import { configDefaults, defineConfig } from "vitest/config"
import path from "node:path"

// Unit tests only (node env); Playwright owns e2e/.
export default defineConfig({
  test: {
    environment: "node",
    // Sample base domain (next.config.ts is not loaded by vitest).
    env: {
      NEXT_PUBLIC_DOMAIN: "cybericebox.local",
      NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.test",
      // the owner-style value of one setting, so the markup tests see a link
      NEXT_PUBLIC_COOKIES_URL: "https://example.test/cookies",
    },
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**", "**/.claude/worktrees/**"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
