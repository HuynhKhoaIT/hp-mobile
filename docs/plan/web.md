# Kế hoạch triển khai — apps/web (Next.js: marketing + người dùng + admin)

Cập nhật: 2026-10-30 · Nguồn: `docs/ARCHITECTURE.md` (mục 4, 6, 7, 9, 11, 12), `apps/web/CLAUDE.md` · Tổng quan: `docs/PLAN.md` · Khu khác: `docs/plan/mobile.md`, `docs/plan/backend.md`

## 1. Mục tiêu và cổng

| Cổng | Thời điểm | Tiêu chí phần web |
|---|---|---|
| 1. Schema + auth chạy | hết tuần 2 | Đăng nhập OTP + Google trên web, cùng tài khoản với app; layout 3 ngôn ngữ; Vercel preview tự deploy mỗi PR; CI xanh |
| 2. Beta 100 người | tuần 6 → 8 | Trang tin công khai có SEO; đăng tin, chat trên web; **`/admin/moderation` tối thiểu** để moderator xử lý hàng chờ trong beta (kéo sớm so với ARCHITECTURE, xem mục 8) |
| 3. Ra mắt Dung Quất | hết tuần 10 | 6 tính năng trên web; admin đủ màn kiểm duyệt / báo cáo / người dùng; Lighthouse mobile ≥ 90 / 100 / 95 ở trang tin |
| 4. Mở rộng khu vực | hết tuần 12 | Landing + `/tai-app` + pháp lý 3 ngôn ngữ; `.well-known` cho app; Google index trang khu vực; domain production |

## 2. Phụ thuộc chéo

### 2.1 Web cần từ backend
| Tuần | Cần sẵn ở backend |
|---|---|
| 1 | Auth bật Phone + Google; Redirect URLs có `http://localhost:3000/**`, `https://*.vercel.app/**`; `packages/tokens` preset Tailwind; `packages/shared` i18n + ns `web`, `admin` |
| 2 | `profiles`, `public_profiles`; JWT claim `app_metadata.role` cho middleware |
| 3 | `public_listings`, `search_listings`, `get_listing_by_slug`, `similar_listings`, `sitemap_listings`; `@hp/core` `listings.ts`; seed |
| 4 | DB webhook gọi `/api/revalidate` khi tin đổi; `public_stats`; `reveal_contact` |
| 5 | `createListing` / `updateListing` / `markSold`; Storage `listing-images` policy; `moderate-listing`; `check_rate_limit` |
| 6 | Chat (bảng, RLS, Realtime), `notifications`; `moderation_queue` + `audit_log` policy cho staff; `is_staff()`; MFA bật trong Auth |
| 7 | `groups`, `public_groups`, `search_groups`, `get_group_by_slug`, `join-group`, `respond-join` |
| 8 | Zod room / lost-found; `match-lost-found`; `request-badge`; `translate-content`; `venues` |
| 9–10 | RPC thống kê admin (`admin_stats`), `reports`, `badge_requests`, `blocks` policy staff |
| 11 | `marketing_leads`, `banners`, `banned_keywords`, `sites` / `venues` ghi cho admin |
| 12 | Project production + Redirect URLs domain thật |

### 2.2 Web cần từ mobile
| Tuần | Cần |
|---|---|
| 6 | Tên event analytics thống nhất |
| 10 | Bundle id + Team ID iOS, package + SHA-256 Android cho `.well-known`; ảnh chụp màn hình app cho landing / `/tai-app` |
| 11 | Link store (hoặc TestFlight / internal) để gắn vào `/tai-app` |

### 2.3 Khu khác cần từ web
- Tuần 4: `/tin/[slug]` chạy để link chia sẻ từ app mở được.
- Tuần 4: endpoint `/api/revalidate` + `REVALIDATE_SECRET` gửi backend cấu hình webhook.
- Tuần 11: `.well-known` live trên domain thật để app verify Universal / App Links.
- Tuần 12: trang pháp lý URL cho store listing của app.

## 3. Lộ trình 12 tuần

| Tuần | Việc | Đầu ra kiểm chứng được | Skill |
|---|---|---|---|
| 1 | Khởi tạo Next (App Router, TS strict), Tailwind preset `@hp/tokens`, shadcn init + chỉnh token, next-intl + `[locale]` + `middleware.ts` (locale + session), `@supabase/ssr` 3 client, link `packages/*`, ESLint `no-restricted-imports` cho admin, `next/font`, `.env.example`, Vercel preview, CI (tsc / lint / i18n:check / build), trang `/dev/ui` trưng component | `pnpm dev` hiện trang trống có header / footer 3 ngôn ngữ; preview URL mỗi PR | — |
| 2 | Layout `(marketing)` và `(app)` (header người dùng: tìm, Đăng tin, tin nhắn, thông báo, avatar; bottom nav mobile); `components/shared` (logo, locale-switcher, theme-toggle, empty / error / skeletons, json-ld, login-dialog); `listing-card` / `group-card` khớp app; khung trang pháp lý MDX; `/dang-nhap` OTP + Google + `next` | **Cổng 1** | `/new-page` |
| 3 | `/tin`, `/pass-do`, `/viec-lam` list SSR + ISR (queries qua RPC công khai), filter client trên `searchParams`, H1 theo khu; `/tim-kiem`; trang khu vực `/pass-do/[site]`, `/viec-lam/[site]` | Danh sách từ seed, HTML có nội dung khi tắt JS | `/new-page` |
| 4 | `/tin/[slug]` SSR + metadata + `opengraph-image` + JSON-LD Product / JobPosting + tin tương tự + 301 slug cũ + 410 tin cũ; `/u/[id]`; `/api/revalidate`; `sitemap.ts` index + `robots.ts`; `OpenInAppBar` | `/seo-check` pass cho tin pass và việc | `/seo-check` |
| 5 | `(auth)`: `/dang-tin` chọn loại + `/dang-tin/[category]` form nhiều bước (pass, job) với nén ảnh trình duyệt, nháp `localStorage`; actions create / update / mark sold; `/toi`, `/toi/tin-cua-toi`, `/toi/da-luu`; bookmark `useOptimistic` | Đăng tin từ web, thấy trên app; RLS chặn sửa tin người khác | `/server-action` |
| 6 | `/tin-nhan` + `/tin-nhan/[conversationId]` (2 cột desktop, 1 cột mobile, Realtime khi tab mở, optimistic, chấm đỏ header); `/thong-bao`; Báo cáo / Chặn; `/admin/login` + MFA + middleware + `/admin/moderation` **tối thiểu** (hàng chờ, duyệt / từ chối, audit) | **Cổng 2 bắt đầu**: moderator xử lý được hàng chờ beta | `/admin-screen` |
| 7 | `/ghep-xe`, `/ghep-tran` list; `/nhom/[slug]` detail + Event JSON-LD + OG; `/tao-nhom/[kind]`; join / respond qua `@hp/core/functions`; Goong map `dynamic import`; `AppOnly` + `AppPromoCard` (reminders) | Tạo / tham gia nhóm trên web; promo card đúng ngữ cảnh | `/new-page` |
| 8 | `/tro` + chế độ bản đồ + filter khoảng cách tới nhà máy + `/tro/[site]`; `/that-lac`; `/toi/nhom-cua-toi`, `/toi/huy-hieu` (upload giấy tờ), `/toi/cai-dat` (ngôn ngữ, xoá tài khoản); nút Dịch | **Cổng 2 kết thúc**: 6 tính năng trên web | `/new-page` |
| 9 | Admin: dashboard (số liệu tách web / app), `reports`, `badges`, `users` (khoá / cấm / đổi vai trò); `DataTable` chung, `ConfirmDialog`, `StatusBadge`, phím tắt, hàng loạt | Moderator và admin dùng được, mọi action có audit | `/admin-screen` |
| 10 | Admin: `listings`, `groups`, `marketing` (banner, blog status, lead + CSV), `catalog` (địa điểm làm việc `sites`: thêm / sửa tên, mã, vị trí trên bản đồ, ẩn hiện `is_active`, thứ tự `sort_order` — ẩn thay vì xoá; venues, từ khoá cấm), `audit` (lọc, CSV); signed URL giấy tờ, che SĐT | **Cổng 3** | `/admin-screen` |
| 11 | Landing đầy đủ 11 section; `/tinh-nang/[slug]`; `/tai-app` (UA detect, QR, UTM); `/cho-chu-tro`; blog MDX; lead form + rate limit + honeypot; PostHog + cookie consent; pháp lý 3 ngôn ngữ hoàn chỉnh; `.well-known` AASA / assetlinks | Lighthouse mobile ≥ 90 / 100 / 95; app verify deep link | `/seo-check` |
| 12 | Rà 3 ngôn ngữ, dark, 360 / 1440, a11y, zoom 200%; Vercel production + domain; Sentry; tune ISR / cache; Google Search Console gửi sitemap; `/web-done-check` toàn bộ | **Cổng 4** | `/web-done-check` |

## 3b. Tiến độ tuần 1 (cập nhật 2026-10-31)
- [x] next-intl 4.14: `[locale]` với `localePrefix: 'as-needed'` (vi không tiền tố), `src/i18n/{routing,navigation,request,messages}.ts`; locale đọc từ `next/root-params` (setRequestLocale đã deprecated); file dịch dùng chung `packages/shared/i18n`, chuyển `{{x}}` → `{x}` và `_one/_other` → ICU khi nạp; locale lạ → 404.
- [x] `proxy.ts` (Next 16 thay middleware.ts): locale → làm mới phiên (`getClaims`) → chặn `/dang-tin`, `/tao-nhom`, `/tin-nhan`, `/thong-bao`, `/toi` (→ `/dang-nhap?next=`) → `/admin` (chưa đăng nhập → `/admin/login`, không staff → 403, chưa aal2 → `/admin/login/mfa`, `X-Robots-Tag: noindex`). Đã thử bằng `next start` + curl.
- [x] `src/lib/supabase/{server,client,admin,proxy}.ts` (`createServerClient`, `createBrowserClient`, `createAdminClient` server-only).
- [x] shadcn (Radix, Nova) + `Button` chỉnh token (min-h-11, text-md, biến thể `accent` chữ tối); tên ngữ nghĩa shadcn trỏ về token trong `app/globals.css`.
- [x] Font Be Vietnam Pro (`next/font`), Noto Sans SC chỉ gắn khi zh (không preload); dark mode `next-themes`; header (logo chữ, đổi ngôn ngữ, đổi giao diện) + footer (dòng miễn trừ, năm cache theo ngày).
- [x] `/dev/ui` (404 ở production); ESLint chặn `next/link`, `redirect` / `useRouter` / `usePathname` của next/navigation, code admin ngoài `app/[locale]/admin`, Supabase trong `app/` (đã thử bằng file vi phạm).
- [ ] Vercel: nối project (Root Directory `apps/web`), env Preview = Supabase staging → preview URL mỗi PR.
- Ghi chú Next 16 + `cacheComponents`: không dùng `export const dynamic / revalidate / dynamicParams`; cache bằng `'use cache'` + `cacheLife` + `cacheTag` (đã sửa `.claude/rules/web-routing-rsc.md`, skill `new-page`).

## 3c. Tiến độ tuần 2 (cập nhật 2026-10-31)
- [x] Nhóm route `(marketing)` (header gọn) và `(app)` (header: tìm, Đăng tin, tin nhắn, thông báo, tài khoản; bottom nav 5 mục < 640px, chừa vùng an toàn iPhone); footer có link pháp lý + đổi ngôn ngữ / giao diện
- [x] `/dang-nhap`: số điện thoại → OTP → onboarding 3 bước (giống app) → về `next` (chống open redirect); Google qua `/auth/callback`; `LoginDialog` đăng nhập tại chỗ; `/toi` tạm (tên, SĐT, khu, quan tâm, đăng xuất)
- [x] `components/shared`: `empty-state`, `error-state`, `skeletons`, `json-ld`, `choice-chip`, `login-dialog`, `user-menu`, `app-header`, `bottom-nav`, `coming-soon`; shadcn `dialog` (sheet đáy trên điện thoại), `input`, `label`, `checkbox`, `skeleton` chỉnh theo token
- [x] Khung pháp lý: `/gioi-thieu` (có nội dung + dòng độc lập), `/dieu-khoan`, `/chinh-sach-bao-mat`, `/xoa-tai-khoan`, `/lien-he` (đang soạn). MDX + nội dung thật: tuần 11, cần `@next/mdx` (hỏi trước)
- [x] Đã kiểm bằng `next start` + cookie phiên thật: khách thấy Đăng nhập; `/toi` khách → `/dang-nhap?next=/toi`; user đã onboarding thấy hồ sơ; user mới thấy nút hoàn tất onboarding
- [ ] `listing-card` / `group-card` dời sang tuần 3, làm cùng `ListingCard` của app khi có bảng `listings` (tránh đoán props)

## 4. Danh sách trang

| Route | Khu | Render | Tuần |
|---|---|---|---|
| `/` | marketing | SSG | 2 khung, 11 đầy đủ |
| `/tinh-nang/[slug]`, `/tai-app`, `/cho-chu-tro`, `/blog/[slug]`, `/gioi-thieu`, `/lien-he`, `/chinh-sach-bao-mat`, `/dieu-khoan`, `/xoa-tai-khoan` | marketing | SSG | 2 khung, 11 |
| `/tin`, `/pass-do`, `/viec-lam` (+ `/[site]`) | public | SSR + ISR 300 | 3 |
| `/tin/[slug]` (+ `opengraph-image`), `/u/[id]`, `/tim-kiem` | public | SSR + ISR / dynamic | 4 |
| `/ghep-xe`, `/ghep-tran`, `/nhom/[slug]` | public | SSR + ISR 300 | 7 |
| `/tro` (+ `/[site]`), `/that-lac` | public | SSR + ISR 300 | 8 |
| `/dang-nhap` | public | dynamic | 2 |
| `/dang-tin`, `/dang-tin/[category]`, `/toi`, `/toi/tin-cua-toi`, `/toi/da-luu` | auth | dynamic | 5 |
| `/tin-nhan`, `/tin-nhan/[conversationId]`, `/thong-bao` | auth | dynamic | 6 |
| `/tao-nhom/[kind]`, `/toi/nhom-cua-moi` | auth | dynamic | 7–8 |
| `/toi/huy-hieu`, `/toi/cai-dat` | auth | dynamic | 8 |
| `/admin/login`, `/admin/login/mfa`, `/admin/moderation` | admin | dynamic | 6 |
| `/admin` (dashboard), `/admin/reports`, `/admin/badges`, `/admin/users` | admin | dynamic | 9 |
| `/admin/listings`, `/admin/groups`, `/admin/marketing/*`, `/admin/catalog/*`, `/admin/audit` | admin | dynamic | 10 |
| `/api/revalidate`, `/.well-known/*` | api | handler | 4, 11 |
| `/sitemap.xml`, `/robots.txt` | — | generated | 4 |

## 5. Hạ tầng kỹ thuật
- **Env** (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `REVALIDATE_SECRET`, `NEXT_PUBLIC_GOONG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `APP_IOS_TEAM_ID`, `APP_IOS_BUNDLE_ID`, `APP_ANDROID_PACKAGE`, `APP_ANDROID_SHA256`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`.
- **Vercel**: preview mỗi PR (Supabase staging), production từ `main` (Supabase prod); Vercel Analytics + Speed Insights; region Singapore.
- **CI** (GitHub Actions): tsc, lint, `i18n:check`, `next build`, kiểm tra bundle admin không ở route public (script đọc `.next/server/app-paths-manifest.json`), Lighthouse CI cho `/` và 1 trang tin seed.
- **Ảnh**: loader `src/lib/image-loader.ts` → Supabase transform; upload client nén 1280px WebP 0.8.
- **Realtime**: chỉ khi tab chat đang mở; 1 kênh / hội thoại; Broadcast cho "đang gõ".
- **Analytics**: PostHog sau cookie consent, không ở admin; event list `src/lib/analytics/events.ts`.
- **Bảo mật**: CSP cơ bản, `X-Frame-Options`, `admin.ts` `server-only`, MFA admin, rate limit action công khai.

## 6. Thay đổi hợp đồng với backend (log)
| Ngày | Gói / RPC / Function | Thay đổi | Việc ở web | Trạng thái |
|---|---|---|---|---|
| 2026-10-31 | `@hp/tokens` | Mới token `onAccent` (`text-on-accent`): chữ trên nút cam Đăng tin | `Button` biến thể `accent` dùng `text-on-accent` | xong |

## 7. Rủi ro riêng web
| Rủi ro | Giảm thiểu |
|---|---|
| Vercel build monorepo sai root | Root Directory = `apps/web`, `transpilePackages` cho `@hp/*`, cài từ gốc bằng pnpm workspace |
| Admin code lọt vào bundle công khai | ESLint `no-restricted-imports` + script kiểm tra manifest trong CI |
| Lộ PII trên trang công khai (SEO index luôn) | Chỉ đọc qua view / RPC công khai; `/seo-check` grep SĐT; test với anon |
| ISR không cập nhật khi tin đổi | Webhook `/api/revalidate` từ backend tuần 4, test bằng đổi trạng thái tin |
| Lighthouse tụt khi thêm bản đồ / animation | Goong dynamic import; `motion` chỉ ở component lá; Lighthouse CI chặn PR |
| Moderator không có công cụ trong beta | `/admin/moderation` tối thiểu tuần 6 (sớm hơn ARCHITECTURE) |

## 8. Lệch so với ARCHITECTURE (có chủ đích)
- `/admin/moderation` tối thiểu kéo lên tuần 6 thay vì tuần 11–12, vì beta tuần 7–8 cần SLA kiểm duyệt 2 giờ. Phần admin còn lại vẫn tuần 9–10.
- Namespace i18n `web`, `admin` đặt cùng chỗ với 6 ns chung trong `packages/shared/i18n` để một script `i18n:check` kiểm cả ba repo.

## 9. Sau MVP
Trang khu vực mở rộng theo `sites`; blog SEO theo cụm từ khoá "trọ gần KCN …"; A/B hero bằng PostHog feature flag; dashboard chỉ số tuần cho moderator; PWA cho web (không thay app).
