---
name: web-done-check
description: Kiểm tra checklist "trước khi báo xong" của CLAUDE.md mục 12 cho web: tsc, lint, i18n:check, build, grep vi phạm rule (supabase trong app/, admin import, hex, chuỗi thô), và checklist thủ công theo khu vực. Dùng trước khi kết thúc một tính năng hoặc mở PR.
---

# Kiểm tra web trước khi "xong"

## 1. Tự động
```
pnpm tsc --noEmit
pnpm lint
pnpm i18n:check
pnpm build
pnpm test        # nếu có
```
Rà trên `git diff --name-only` (và file mới):
- `app/**` import `@supabase/*` hoặc `@/lib/supabase/*` trực tiếp (ngoài `queries.ts` / `actions.ts` / route handler) → vi phạm.
- `features/admin`, `components/admin`, `lib/supabase/admin` được import ngoài `app/[locale]/admin/**` → vi phạm.
- `'use client'` trong `page.tsx` / `layout.tsx` → vi phạm.
- Hex `#[0-9A-Fa-f]{3,6}` hoặc class `-\[` trong `app/`, `src/` → vi phạm.
- Chuỗi có dấu tiếng Việt trong JSX / props / metadata ngoài MDX và test → vi phạm i18n.
- `next/link` / `next/navigation` import trực tiếp thay vì `@/i18n/navigation` → vi phạm.
- Action không trả `ActionResult` hoặc thiếu `revalidate*` → vi phạm.
- Action admin thiếu `writeAudit(` → vi phạm.
- `NEXT_PUBLIC_` có `SERVICE_ROLE` → vi phạm nghiêm trọng.
- Output `next build`: route public có chunk admin / chat / goong → vi phạm.

## 2. Thủ công
**Chung**
- [ ] Logic dữ liệu nằm ở `@hp/core`; app (`apps/mobile`) vẫn `tsc` pass
- [ ] 3 ngôn ngữ đủ key; light + dark; 360px và 1440px
- [ ] Loading / empty / error đủ

**Trang công khai**
- [ ] `/seo-check` pass (server render, metadata, JSON-LD, OG, sitemap, Lighthouse)
- [ ] Không lộ SĐT, vị trí chính xác, họ tên đầy đủ

**Khu người dùng**
- [ ] Middleware chặn đúng; sau đăng nhập quay về đúng hành động (`LoginDialog` intent)
- [ ] Server action: Zod, auth, revalidate; thử sửa tin người khác → `forbidden`
- [ ] Tính năng app-only hiện `AppPromoCard`, không popup chặn

**Admin**
- [ ] anon / user / moderator / admin bị chặn hoặc cho đúng; `noindex`; MFA
- [ ] Mọi action ghi `audit_log`; không import `admin.ts` vào client

## 3. Báo cáo
Liệt kê mục chưa đạt kèm `file:dòng`. Bước không chạy được ghi rõ "chưa kiểm tra", không đánh dấu đạt.
