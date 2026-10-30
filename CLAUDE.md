# CLAUDE.md — Super app cộng đồng (monorepo)

Super app cộng đồng cho người lao động quanh các khu liên hợp Hòa Phát: Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc (mẫu **Listing**); Ghép xe, Ghép trận (mẫu **Group**). App cá nhân, độc lập; **không** dùng logo Hòa Phát; luôn có dòng "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát". Ngôn ngữ người dùng: vi (mặc định), en, zh.

Kiến trúc đầy đủ: `docs/ARCHITECTURE.md`. Kế hoạch: `docs/PLAN.md` + `docs/plan/*.md`.

## Cấu trúc

```
apps/mobile/      Expo (iOS, Android)              → apps/mobile/CLAUDE.md
apps/web/         Next.js: marketing, người dùng, /admin → apps/web/CLAUDE.md
supabase/         migrations, functions, tests, seed → supabase/CLAUDE.md (quản cả packages/)
packages/core     hàm gọi Supabase, query keys, hooks TanStack, capabilities, urls
packages/shared   Zod schemas, enums, i18n vi/en/zh, format, slug
packages/db       database.types.ts sinh tự động
packages/tokens   design tokens + preset Tailwind / NativeWind
docs/             ARCHITECTURE.md, PLAN.md, plan/, RUNBOOK.md
.claude/rules     rule theo path (mobile-*, web-*, be-*)
.claude/skills    quy trình chuẩn, gọi bằng /tên
```

Khi làm trong một khu vực, đọc `CLAUDE.md` của khu đó; file đó thắng khi mâu thuẫn với file này.

## Luật chung (áp dụng mọi nơi)

1. **Dùng chung trước, viết riêng sau.** Mọi gọi server, query key, hook dùng chung nằm ở `packages/core`; Zod / enum / chữ ở `packages/shared`; type ở `packages/db`; token ở `packages/tokens`. App và web không viết lại. Thiếu thì thêm vào gói rồi dùng ở cả hai nơi.
2. **Quy tắc vàng:** 4 tính năng Listing dùng chung `features/listing`, 2 tính năng Group dùng chung `features/group`; khác biệt chỉ trong `config.ts`. Thêm tính năng mới = thêm `category` / `kind`.
3. **Quyền ở tầng dữ liệu.** RLS quyết định; client chỉ ẩn / hiện. Mọi bảng bật RLS + test pgTAP 4 vai trò (anon, user, bị cấm, moderator). Service role key chỉ ở Edge Functions và server admin web.
4. **Một logic một tầng:** PostgREST + RLS cho CRUD; RPC cho đọc phức tạp; trigger cho ràng buộc / đếm / notification; Edge Function cho secret, transaction nhiều bước, dịch vụ ngoài; pg_cron cho định kỳ.
5. **Đa ngôn ngữ:** mọi chữ qua `t()`; thêm key vào cả 3 file `packages/shared/i18n/{vi,en,zh}` trong cùng commit; `pnpm i18n:check` phải pass. Tiền / ngày / khoảng cách qua `format.ts`, tiền luôn VND.
6. **Design token một chỗ:** không hex, không px tuỳ ý ngoài preset `@hp/tokens`; card / badge / trạng thái nhìn giống nhau trên app và web.
7. **Trạng thái đủ:** mọi màn / khối dữ liệu có loading (skeleton), empty (CTA), error (thử lại).
8. **Link chia sẻ là URL web** `https://tenapp.vn/tin/{slug}`, `/nhom/{slug}`; app mở qua Universal / App Links. Tính năng chỉ có app khai báo ở `packages/core/capabilities.ts`.
9. **Không lộ PII** trên trang công khai: SĐT, vị trí chính xác (làm tròn ~300 m), họ tên đầy đủ, giấy tờ. Anon chỉ đọc qua view / RPC công khai.
10. **Kiểm duyệt là tính năng lõi:** rule tự động + moderator; mọi hành động staff ghi `audit_log`; không xoá cứng.
11. TypeScript strict, không `any`, không `@ts-ignore`. Conventional Commits với scope theo khu (`feat(pass)`, `feat(web-room)`, `feat(db)`, `feat(core)`). Không secret trong git; biến môi trường khai báo trong `.env.example` của từng app.
12. Không sửa file ngoài phạm vi được yêu cầu. Thêm thư viện → hỏi trước.

## Định nghĩa "xong" cho một tính năng
- [ ] Backend: migration + RLS + pgTAP + type sinh lại; RPC / Edge Function có test; `supabase/CLAUDE.md` mục 4 cập nhật
- [ ] `packages/core` / `shared` cập nhật; `pnpm -r build` xanh
- [ ] App chạy iOS + Android; web chạy; cả hai qua checklist mục 12 của CLAUDE.md khu đó (`/mobile-done-check`, `/web-done-check`, `/be-done-check`)
- [ ] 3 ngôn ngữ; light + dark; a11y; loading / empty / error
- [ ] `docs/plan/*.md` mục "Thay đổi hợp đồng" ghi nếu API dùng chung đổi

## Lệnh
```
pnpm install                    # workspace: apps/*, packages/*
supabase start | db reset | test db | functions serve <name>
pnpm -r build && pnpm i18n:check
pnpm --filter mobile start | tsc --noEmit | lint
pnpm --filter web dev | build | tsc --noEmit | lint
```
