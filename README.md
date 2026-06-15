# id-frontend — CyberICEBox Identity Portal

This is the **canonical design system (DS)** home for the CyberICEBox frontend ecosystem. All other apps (`main-frontend`, etc.) receive DS files by manual copy from this repo.

## Stack

- Next.js 16 · static export (`output: 'export'`)
- React 19.2
- TypeScript (strict)
- Tailwind CSS v4 + `@tailwindcss/postcss`
- shadcn/ui new-york · slate base · CSS variables
- `react-hook-form` + `zod` + `@hookform/resolvers`

## Dev

```bash
npm install
npm run dev        # http://localhost:3001
npm run build      # produces out/ (static export)
```

## Design System

> **Visual tokens are placeholders.** The values in `src/app/globals.css` (`:root` / `.dark` blocks) copy slate-based shadcn defaults. A brand pass will update them — do NOT design a palette before that task.

### What constitutes the DS

| File / Directory | Purpose |
|---|---|
| `src/app/globals.css` | `@theme` token block + `:root` / `.dark` CSS-variable declarations |
| `src/utils/cn.ts` | `cn()` utility (`clsx` + `tailwind-merge`) |
| `src/components/ui/*.tsx` | Base shadcn components (button, input, label, form, card, dialog, dropdown-menu, tabs, alert) |
| `messages/en.json` | i18n string catalog |

### DS sync procedure (id-frontend → other apps)

Copy direction: **id-frontend is the source of truth → copy TO other apps**.

```
cp id-frontend/src/app/globals.css          main-frontend/src/app/globals.css
cp id-frontend/src/utils/cn.ts             main-frontend/src/utils/cn.ts
cp -r id-frontend/src/components/ui/       main-frontend/src/components/ui/
cp id-frontend/messages/en.json            main-frontend/messages/en.json
```

After copying into a target app, verify the target's `package.json` includes matching Radix UI + shadcn deps, then run its build.

Do **not** make DS changes directly in `main-frontend` — always edit here and re-sync.
