# Kế hoạch MVP 12 tuần — tổng quan

Cập nhật: 2026-10-30 · Nguồn: `docs/ARCHITECTURE.md` mục 12, 13 · Kế hoạch chi tiết từng khu: `docs/plan/mobile.md`, `docs/plan/web.md`, `docs/plan/backend.md`

## 1. Cách tổ chức
- Một monorepo (pnpm workspace + Turborepo): `apps/mobile`, `apps/web`, `supabase/`, `packages/*`. Một PR có thể đổi schema → type → core → app → web cùng lúc; CI build cả ba.
- Đội tối thiểu 3 người (ARCHITECTURE mục 12): product + thiết kế, mobile, backend + web. Một người có thể kiêm mobile + backend nếu có người thứ hai review schema và RLS trước ra mắt.
- Mỗi tuần: backend đi trước nửa tuần, app và web dùng ngay dữ liệu seed; tính năng chỉ "xong" khi cả ba khu qua checklist của mình.

## 2. Việc cần chốt tuần 1
| Việc | Ảnh hưởng |
|---|---|
| ~~Tên app~~ **Đã chốt 2026-10-30: "Người Dung Quất"** (`APP_NAME` trong `packages/shared`). Còn chốt: định danh kỹ thuật (slug, bundle id, scheme thay `hoaphat`) | store, landing, disclaimer |
| Domain thật thay `tenapp.vn` | deep link, `.well-known`, Auth redirect, sitemap |
| Bundle id iOS / package Android | `.well-known`, Goong key, EAS |
| Nhà cung cấp OTP (ZNS hay SMS brandname) và API dịch | `send-otp`, `translate-content`, chi phí |
| Region Supabase (Singapore), tài khoản Vercel, EAS | môi trường staging / prod |
| Moderator đầu tiên | `/admin` tuần 6, beta tuần 7 |

## 3. Cổng và tiêu chí (gộp ba khu)
| Cổng | Thời điểm | Backend | Mobile | Web |
|---|---|---|---|---|
| 1. Schema + auth chạy | hết tuần 2 | Core schema, RLS + pgTAP, `send-otp`, `packages/*` build, CI | OTP thật trên máy, ≥ 10 component trong `ui-gallery`, EAS dev build | OTP + Google cùng tài khoản, layout 3 ngôn ngữ, Vercel preview |
| 2. Beta 100 người | tuần 6 → 8 | Staging, Listing + Chat + push, `moderate-listing`, backup | Pass, Việc, Chat, Thông báo, Hồ sơ trên kênh `staging`, crash < 1% | Trang tin SEO, đăng tin, chat, `/admin/moderation` tối thiểu |
| 3. Ra mắt Dung Quất | hết tuần 10 | Đủ RPC / function 6 tính năng, cron, pen-test pass | 6 tính năng, TTI p75 < 1.5s, deep link + push đúng | 6 tính năng, admin đủ, Lighthouse ≥ 90 / 100 / 95 |
| 4. Mở rộng khu vực | hết tuần 12 | Production, PITR, runbook, thử khôi phục | Lên store, 3 ngôn ngữ, EAS Update | Landing, `/tai-app`, pháp lý, `.well-known`, domain |

## 4. Nhịp theo tuần (tóm tắt, chi tiết trong `docs/plan/*`)
| Tuần | Backend (`supabase/`, `packages/`) | Mobile (`apps/mobile`) | Web (`apps/web`) |
|---|---|---|---|
| 1 | init, extensions, tokens, shared khung, CI | init Expo, providers, gallery | init Next, Tailwind, next-intl, ssr clients |
| 2 | Core schema + RLS, `send-otp`, claims, seed users | design system 1–5, auth flow | layout, shared components, cards, `/dang-nhap` |
| 3 | Listing schema, view, search RPC, storage, Zod pass / job, core listings | design system 6–7, listing engine, Hub, detail | list pass / việc SSR + ISR, tìm kiếm, trang khu vực |
| 4 | listing write, `moderate-listing`, `reveal_contact`, sitemap / stats, revalidate webhook | form engine, đăng pass + việc, search, bookmark | `/tin/[slug]`, OG, JSON-LD, sitemap, robots, `/api/revalidate` |
| 5 | Chat schema + trigger + Realtime, chat-images, core chat | chat 1-1, báo cáo / chặn, hướng dẫn an toàn | `/dang-tin` form, actions, `/toi` |
| 6 | `send-push`, prefs, staging + CI deploy, staff policies | push, thông báo, hồ sơ, đã bán, cài đặt, build staging | chat web, thông báo, `/admin/login` + MFA + moderation tối thiểu |
| 7 | Group schema, `join_group_tx`, `join-group`, core groups | group engine, ride, MapView, join animation | ghép xe / ghép trận list + detail + tạo nhóm, AppOnly |
| 8 | `respond-join`, cron remind / expire, venues | sport, host duyệt, chat nhóm, explore | trọ + bản đồ, thất lạc, nhóm của tôi, huy hiệu |
| 9 | Zod room / lost-found, `match-lost-found`, `home_feed`, auto-hide | room (bản đồ, filter), lost-found | admin dashboard, reports, badges, users |
| 10 | `request-badge`, `translate-content`, purge cron, `admin_stats`, pen-test 1 | huy hiệu, dịch, offline, coach mark, perf | admin listings, groups, marketing, catalog, audit |
| 11 | marketing tables, catalog write, 50k tin explain, review RLS lần 2 | rà i18n / a11y / motion, test deep link, store assets | landing, `/tai-app`, blog, lead, consent, pháp lý, `.well-known` |
| 12 | production, secrets, PITR, runbook, pen-test 2 | EAS production + submit, Sentry, PostHog | Vercel production, domain, Search Console |

## 5. Hợp đồng dùng chung
Danh sách view / RPC / Edge Function / notification type / payload push / gói `@hp/*` mà app và web được phép phụ thuộc nằm ở `docs/plan/backend.md` mục 2. Mỗi lần đổi → ghi vào mục "Thay đổi hợp đồng" của file đó; app và web đọc bảng đó để biết việc phải làm.

## 6. Lệch có chủ đích so với ARCHITECTURE
- `/admin/moderation` tối thiểu lên tuần 6 (thay vì 11–12) để beta tuần 7–8 có SLA kiểm duyệt 2 giờ.
- Namespace i18n `web`, `admin`, `push` đặt cùng `packages/shared/i18n` với 6 ns chung để một `i18n:check` kiểm cả ba khu.
- Mọi file dịch dùng cú pháp i18next; web chuyển sang next-intl qua adapter lúc build.

## 7. Rủi ro chung
| Rủi ro | Giảm thiểu |
|---|---|
| AI sinh code lệch kiến trúc qua nhiều phiên | `CLAUDE.md` từng khu + `.claude/rules` theo path + skill `*-done-check` trước mỗi PR; refactor nhỏ hàng tuần |
| Lừa đảo làm mất uy tín | huy hiệu, rule kiểm duyệt, hướng dẫn an toàn, SLA 2 giờ, pen-test |
| Marketplace trống lúc đầu | seed tin thật, mời chủ trọ / chủ sân sớm, ra mắt từng khu |
| Phụ thuộc Supabase | Postgres + Deno chuẩn, self-host được, backup hàng ngày |
| Mạng yếu trong nhà máy | cache MMKV, nháp offline, ảnh nhẹ, web SSR nhẹ |
