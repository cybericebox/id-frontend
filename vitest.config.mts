import { configDefaults, defineConfig } from "vitest/config"
import path from "node:path"

// Unit tests only (node env); Playwright owns e2e/.
export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**", "**/.claude/worktrees/**"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
