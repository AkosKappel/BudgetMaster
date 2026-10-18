# BudgetMaster

Author: **Ákos Kappel**

A mobile-first personal finance app for tracking income and expenses. This is a rebuild from scratch of the original Next.js and MongoDB version.

Status: early development.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) on Vite and Nitro
- TypeScript
- [TanStack Query](https://tanstack.com/query) for server state, [Zustand](https://zustand.docs.pmnd.rs/) for client state
- [shadcn/ui](https://ui.shadcn.com/) on Tailwind CSS 4
- [Motion](https://motion.dev/) (formerly Framer Motion) for animations
- ESLint and Prettier

## Getting started

Requires Node 24 and pnpm.

```bash
pnpm install
pnpm dev
```

The app runs on http://localhost:3000.

## Scripts

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Start the dev server                    |
| `pnpm build`     | Production build into `.output/`        |
| `pnpm preview`   | Preview the production build            |
| `pnpm typecheck` | Type-check with `tsc`                   |
| `pnpm lint`      | Lint with ESLint                        |
| `pnpm check`     | Check formatting with Prettier          |
| `pnpm format`    | Format with Prettier and fix lint rules |

## UI components

Add shadcn/ui components with:

```bash
pnpm dlx shadcn@latest add <component>
```
