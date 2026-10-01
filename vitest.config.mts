import { configDefaults, defineConfig } from "vitest/config"
import path from "node:path"

// Unit tests only (node env); Playwright owns e2e/.
export default defineConfig({
  test: {
    environment: "node",
    // Sample hosts (next.config.ts is not loaded by vitest).
    env: {
      NEXT_PUBLIC_MAIN_HOST: "cybericebox.local",
      NEXT_PUBLIC_API_HOST: "api.cybericebox.local",
      NEXT_PUBLIC_ID_HOST: "id.cybericebox.local",
      NEXT_PUBLIC_ADMIN_HOST: "admin.cybericebox.local",
      NEXT_PUBLIC_EXERCISES_HOST: "exercises.cybericebox.local",
      NEXT_PUBLIC_EVENT_DOMAIN: "cybericebox.local",
    },
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**", "**/.claude/worktrees/**"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
