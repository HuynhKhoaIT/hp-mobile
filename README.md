# Super app cộng đồng — monorepo

Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát.

| Thư mục | Nội dung |
|---|---|
| `apps/mobile` | Expo (iOS, Android) |
| `apps/web` | Next.js: marketing, người dùng, `/admin` |
| `supabase` | migrations, Edge Functions, tests, seed |
| `packages/*` | `@hp/core`, `@hp/shared`, `@hp/db`, `@hp/tokens` dùng chung |
| `docs` | `ARCHITECTURE.md`, `PLAN.md`, `plan/*` |

```
pnpm install
pnpm db:start          # Supabase local (cần Docker)
pnpm dev               # mọi app
pnpm typecheck && pnpm lint && pnpm i18n:check && pnpm build
```

Luật cho AI và người: `CLAUDE.md` ở gốc và trong từng khu vực.
