# Kế hoạch triển khai — apps/web (Next.js: marketing + người dùng + admin)

Cập nhật: 2026-10-31 · Nguồn: `docs/ARCHITECTURE.md` (mục 4, 6, 7, 9, 11, 12), `apps/web/CLAUDE.md` · Tổng quan: `docs/PLAN.md` · Khu khác: `docs/plan/mobile.md`, `docs/plan/backend.md`

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
- [x] `listing-card` làm ở tuần 3 cùng `ListingCard` của app (xem 3d); `group-card`: tuần 7
- [x] Danh sách `/tin` (tất cả), `/pass-do`, `/tro`, `/viec-lam`, `/that-lac`: một cài đặt `features/listing/components/listing-list-page.tsx`, khác biệt ở `features/{pass,room,job,lost-found}/config.ts` (category, icon, màu dịch vụ, bố cục thẻ grid / row, loại JSON-LD). `/tro`, `/that-lac` kéo sớm từ tuần 8 (chưa có bản đồ / lọc khoảng cách)
- [x] Bộ lọc trên URL `?category=&q=&site=` kiểm bằng `ListingFilters` (sai → bỏ qua): chip là link, ô tìm + chọn khu là form GET (chạy khi tắt JS); H1 + title "… gần {khu}" khi lọc khu; "Xem thêm" theo `nextCursor` ở trình duyệt; empty (`list.empty_*` + Đăng tin / Xoá từ khoá), lỗi → `error.tsx` thử lại
- [x] Cache: trang đầu không từ khoá `'use cache'` 300s (tag `listings`); fallback của `<Suspense>` chính là trang đầu không lọc → static shell có tin thật (tắt JS / bot chỉ đọc HTML vẫn thấy tin); kết quả lọc đọc `searchParams` trong Suspense; có từ khoá → không cache. Lỗi ném trong hàm cache (không cache lỗi)
- [x] `ListingCard` (grid 4:3 / row vuông), `Badge`, skeleton grid + row khớp app; ảnh trống = nền `service-*-soft` + icon
- [x] `/tin/[slug]`: `getListingPage` cache 300s + tag `listing:{id}`; slug khác chuẩn → `permanentRedirect` 308; không có → `not-found.tsx` (404); 20 tin mới nhất prerender lúc build; metadata "{tiêu đề} – {giá} – {khu}", canonical + hreflang 3 ngôn ngữ + x-default, OG (ảnh bìa nếu có); JSON-LD Product+Offer (pass), JobPosting (việc), Accommodation (trọ); 2 cột ≥ 1024px, cột phải dính; Nhắn tin (khách → LoginDialog, đã đăng nhập → "sắp có"), Chia sẻ (Web Share / sao chép), ghi lượt xem khi đã đăng nhập, tin tương tự
- [x] Ảnh đại diện: chọn ảnh ở onboarding bước 2 và đổi ở `/toi` (cắt vuông 512, WebP / JPEG ≤ 1 MB bằng canvas, `uploadAvatar`)
- [x] Env `NEXT_PUBLIC_IMAGE_TRANSFORM` (false trên staging gói Free); `apps/web/.env.example` trước đây bị `.gitignore` bỏ qua → đã mở lại
- [x] Đã kiểm `next start` + curl: 5 trang danh sách 200 (vi / en / zh), chi tiết 200, slug sai 308, slug không có 404, không có SĐT / toạ độ trong HTML
- [x] **Quyết định 2026-10-31: giữ nguyên** — lần truy cập ĐẦU TIÊN vào slug chưa prerender trả 200 + redirect phía client / `noindex` (App Shell); lần sau và bot chỉ đọc HTML nhận 308 / 404 thật. Người dùng luôn thấy đúng trang. Đã thử chuyển `UserMenu` sang client: không đổi được mã lần đầu (shell gửi trước vì `params` chưa prerender), nên bỏ. Nếu đo SEO thấy vấn đề → kiểm slug trong `proxy.ts` (thêm 1 lần gọi DB / lượt xem tin)
- [x] Phần "còn lại tuần 4" đã làm ở mục 3e (trừ `opengraph-image.tsx`, `OpenInAppBar`, trang khu vực, "Xem thêm" không JS — vẫn còn)
- [ ] Chưa kiểm: Lighthouse mobile, xem bằng mắt 360 / 1440 + dark, upload ảnh đại diện thật trên trình duyệt

g `ListingCard` của app khi có bảng `listings` (tránh đoán props)

## 3e. Tiến độ tuần 4 — đăng tin + quản lý tin + SEO (cập nhật 2026-10-31)
- [x] **Đăng tin "Đăng nhanh"** `/dang-tin` (`?feature=pass|room|job|lostFound` chọn sẵn): một engine `features/listing/components/listing-form/*` theo config + `ATTRIBUTE_FIELDS`. Bước 0 chọn tính năng (4 ô) → danh mục (chip, khi > 1) · 1 ảnh (nhiều ảnh, tối đa 10, xoá, đặt làm bìa; pass / trọ nhắc `form.photos_required`, không chặn) · 2 thông tin chính (tiêu đề, hình thức giá + giá — ẩn với việc / thất lạc, mô tả) · 3 chi tiết (enum → chip, số / tiền → ô số + gợi ý đã định dạng, bool → checkbox, text, datetime-local; khu mặc định theo hồ sơ, khu vực, ngôn ngữ mặc định theo trang, `form.rules_hint`). Kiểm từng bước bằng chính `CreateListingInput` (Zod @hp/shared); lỗi server (`fieldErrors`) nhảy về đúng bước. Việc làm / thất lạc gửi `price_type: 'negotiable'`, `price: null`
- [x] Ảnh: nén ở trình duyệt bằng canvas (cạnh dài 1280, WebP 0.8 → JPEG nếu không hỗ trợ, ≤ 2 MB, không thư viện — giống ảnh đại diện), upload thẳng Storage bằng `uploadListingImage`. Luồng: có ảnh mới → `createListingAction(draft, images: [])` → upload từng ảnh (`form.uploading` x/y; ảnh lỗi gắn nhãn + nút `form.upload_retry`, thử lại không tạo tin trùng) → `updateListingAction({ id, category, images, status })`; không ảnh mới → tạo thẳng `active` / `draft`. Ảnh bỏ khi sửa → `removeListingImages` sau khi lưu thành công
- [x] Màn kết quả theo status DB trả về: active → `form.success_*` (sửa: `form.saved`), pending_review → `form.pending_*` + `manage.reason.*`, rejected → `form.rejected_*` + nút Sửa, draft → `form.draft_saved`; link Xem tin / Đăng tin khác / Tin của tôi
- [x] Sửa tin `/toi/tin-cua-toi/[id]/sua` (không dùng `/dang-tin/[id]` để khỏi đụng `/dang-tin/[category]` trong bảng route): điền sẵn từ `getMyListing`, giữ ảnh cũ, thêm / xoá / đổi bìa; tin nháp có Lưu nháp + Đăng tin, tin khác chỉ "Lưu thay đổi" (không gửi status — DB không cho chủ tin mở lại tin chờ duyệt / bị từ chối / hết hạn). Tin không phải của mình / không có → not-found. "Huỷ" khi đang soạn → `form.discard_*`; đóng tab khi chưa lưu → cảnh báo của trình duyệt. Đăng mới tự lưu phần chữ vào `localStorage` (bọc try/catch) và lần sau hỏi "Tiếp tục soạn / Bỏ tin" (`web.post.restore_body`)
- [x] **Tin của tôi** `/toi/tin-cua-toi?tab=active|pending|draft|closed` (tab là link, chạy khi tắt JS): dòng = ảnh bìa, tiêu đề, badge `common.status.*`, giá, `manage.expires_on`, lượt xem, ghi chú chờ duyệt / bị từ chối + lý do. Menu (`DropdownMenu` shadcn): Sửa · Đánh dấu đã bán (xác nhận `manage.sold_*`) · Đóng tin · Mở lại (đã bán / đã đóng) · Gia hạn (≤ 3 ngày cuối hoặc đã hết hạn) · Xoá (xác nhận `manage.delete_*`); toast `manage.*_done` / `renewed`; "Xem thêm" đọc ở trình duyệt. **Tin đã lưu** `/toi/da-luu`. `/toi` có lối vào hai trang này
- [x] **Chi tiết tin**: tim Lưu tin (`useOptimistic`, khách → LoginDialog), "Hiện số điện thoại" → nút `tel:+84…` (`contact.call`, `contact.no_phone`, lỗi `errors.*` như `rate_limited`); SĐT chỉ đến sau khi bấm (không có trong HTML). LoginDialog nhận `intent` (lưu `sessionStorage`): sau đăng nhập trang tải lại và tự Lưu / Hiện số. Chủ tin xem tin mình → `web.listing.owner_note` + Sửa tin + Tin của tôi (không liên hệ). Tin đã bán / đóng / hết hạn → banner `state.*` + `state.inactive_hint`, badge trạng thái, ẩn liên hệ, không JSON-LD, vẫn có tin tương tự
- [x] **410**: Next 16 không có API đặt mã 410 cho page. Cách chọn: page `/tin/[slug]` gặp tin `isListingGone` (thôi hiện > 30 ngày) → `redirect` 307 tới route handler `/tin/[slug]/da-go` trả **410** (HTML tối giản 3 ngôn ngữ, `noindex`, link về danh sách; tin đã mở lại → 307 về trang tin; không có → 404). 307 (không 308) vì chủ tin có thể mở lại tin. Không kiểm trong `proxy.ts` (thêm 1 lần gọi DB mỗi lượt xem — đã quyết định không làm). Đã đo: bot "HTML-limited" của Next (bingbot, facebookexternalhit…) nhận `307 Location` thật → `410`; trình duyệt và Googlebot (render JS) nhận khung PPR mã 307 **không có header `Location`** + chuyển hướng phía client → `410`. Lưu ý: redirect 308 slug cũ (tuần 3) cũng y như vậy — Next 16.4 không gửi `Location` khi phục vụ khung PPR đã cache
- [x] **Server Action** `features/listing/actions.ts` cho mọi thao tác ghi (đăng, sửa, đổi trạng thái, xoá, gia hạn, hiện số, lưu tin): Zod (@hp/shared) → đăng nhập (`getClaims`) → @hp/core (RLS quyết định; người khác đổi tin → `not_found`) → `updateTag('listing:{id}')` + `updateTag('listings')` → `ActionResult` (`src/lib/action-result.ts`). Đọc dữ liệu riêng ở client (trạng thái đã lưu, "Xem thêm") vẫn gọi @hp/core với `createBrowserClient()` như tuần 3. Input nhỏ (id, trạng thái, bookmark) chưa có schema ở @hp/shared → kiểm uuid / enum ngay tại action
- [x] **`/api/revalidate`** (POST): so `x-revalidate-secret` thời gian hằng (SHA-256 + `timingSafeEqual`), body `{ tags }` chỉ nhận `listings` / `listing:<uuid>` (≤ 20); `listing:*` → `revalidateTag(tag, { expire: 0 })`, `listings` → `'max'`; 401 / 400 / 200 JSON
- [x] **Sitemap / robots**: Next không tự sinh sitemap index → route handler `/sitemap.xml` (index) + `/sitemaps/static.xml` (trang tĩnh × 3 ngôn ngữ, hreflang) + `/sitemaps/listings-{n}.xml` (RPC `sitemap_listings`, 10.000 / file, số file = `public_stats().listings / 10.000`; chỉ URL vi, en / zh khai báo qua hreflang trong trang); cache 1 giờ + tag `listings`. `robots.ts` chặn `/admin`, `/toi`, `/tin-nhan`, `/dang-tin`, `/thong-bao`, `/tao-nhom`, `/dang-nhap`, `/api/` cho cả `/en`, `/zh`. **Toàn site vẫn `noindex` ở layout gốc tới khi ra mắt** — robots.txt cho thu thập để bot đọc được thẻ đó
- [x] **`/tim-kiem`**: cùng engine danh sách (scope `search`, mọi category), ô tìm ở header gửi `?q=`; có từ khoá → đọc theo request + `logSearch` sau khi trả trang (`after()`), `noindex, follow`. Nút Đăng tin ở trang tính năng mở `/dang-tin?feature=…`
- [x] Dùng chung mới: `components/shared/{toast,confirm-dialog,login-intent}`, `components/ui/{dropdown-menu,textarea}` (dropdown sinh bằng shadcn CLI rồi chỉnh token; CLI tự thêm gói `cn` → đã gỡ, lockfile cài lại). Key mới `web.json`: `post.{step_basics,preparing_photos,restore_body}`, `listing.owner_note`, `listing.search.{title,description,heading_site}`
- [x] Đã kiểm `next start -p 3200` + curl: danh sách / chi tiết / `/tim-kiem?q=giay` 200 (ghi `search_logs`); tin đã bán 200 + banner, không JSON-LD; đã bán + `updated_at` 31 ngày trước → 307 → `/da-go` **410**; khách vào `/dang-tin`, `/toi/*` → 307 `/dang-nhap?next=`; chủ tin: `/dang-tin`, Tin của tôi, Đã lưu, trang sửa 200, người khác mở trang sửa → not-found; Server Action qua HTTP: hiện số (đăng nhập ok / khách `auth_required`), lưu tin, người khác đổi trạng thái → `not_found`, Zod `too_short` + `price_required`, gia hạn sớm `too_early`, đăng → đã bán (rời danh sách, chi tiết có banner) → mở lại → xoá (404); `/api/revalidate` 401 / 400 / 200; `/sitemap.xml`, `/robots.txt`; không có SĐT trong HTML công khai
- [x] Theo backend mới (gửi duyệt lại): tin `rejected` có thao tác `manage.resubmit` trong menu (status `active` → DB chuyển `pending_review`, lý do `resubmit`, toast `form.pending_title`); trang sửa tin bị từ chối có nút chính `manage.resubmit` gửi `status: 'active'` kèm nội dung, màn kết quả theo status trả về; tin khác không phải nháp vẫn không gửi status. "Đánh dấu đã bán" chỉ cho pass đồ / trọ (việc làm / thất lạc chỉ Đóng tin) — khớp app
- [ ] Chưa kiểm bằng trình duyệt (phiên không có công cụ trình duyệt): form nhiều bước, upload ảnh thật, toast, menu, LoginDialog + intent, 360 / 1440 px, dark mode
- [ ] Còn lại: `opengraph-image.tsx` cho tin, `/u/[id]`, `OpenInAppBar`, trang khu vực `/pass-do/[site]`…, "Xem thêm" không JS, bố cục 2 cột cho form ≥ 1024 px (hiện một cột, cùng thứ tự với app)

## 3f. Trang chủ Hub kiểu super app (cập nhật 2026-11-01)
Theo `docs/design/home.md` (§3 thứ tự khối, §10 thông số). Route `/` nằm trong `(app)`; code ở `src/features/home/*`.
- [x] **Header cùng tồn tại với AppHeader**: điện thoại (< 640px) AppHeader ẩn ở `/` (`components/shared/app-header-shell.tsx`, `usePathname` nên không nháy) → header xanh của Hub là header duy nhất: hàng 48 (ảnh đại diện → `/toi` · "Chào {tên gọi}" + `home.subtitle` · chuông có số), khách: tên app + nút Đăng nhập (LoginDialog); chip khu; ô tìm kiếm cao 48 **dính trên cùng** khi cuộn (thanh xanh, có bóng khi đang dính). Từ 640px giữ AppHeader như mọi trang (logo, tìm, Đăng tin, tin nhắn, chuông, tài khoản) và dải xanh chỉ còn lời chào lớn + chip khu (không lặp ô tìm / chuông). Chuông của AppHeader giờ có số chưa đọc (`features/notifications/components/notification-bell.tsx`, gộp một lần gọi `countUnreadNotifications` 30 giây, đọc lại khi quay lại tab, "9+", lắc nhẹ khi số tăng)
- [x] **Chia render** (trang vẫn PPR tĩnh, không `cookies()`): server + cache — lưới 8 ô, chip Tìm nhanh, banner (`listBanners` web_home, 300s tag `banners`), 4 dải theo dịch vụ (dùng chung cache trang đầu `/pass-do`…), dải "Gần {khu}" của **khu mặc định** (sites[0]) để HTML có tin thật, số liệu (`public_stats` 1 giờ). Trình duyệt (`HomeProvider`): phiên + hồ sơ, khu đã chọn (profiles.site → localStorage `hp:home-site` → khu đầu), đổi khu (khách lưu máy; đăng nhập `updateMyProfile`, lỗi trả khu cũ + toast), "Gần {khu}" khi khu khác mặc định, "Dành cho bạn" (interests ∩ Listing, bỏ tin trùng "Gần bạn"), thẻ cá nhân, số thông báo. Server lỗi một khối → khối đó tự tải lại ở trình duyệt (`use-loadable.ts`), vẫn lỗi → `SectionError` + Thử lại
- [x] Lưới dịch vụ `HOME_TILES` (thẻ nổi -48px, 4×2 / 8 cột từ 768px, nhãn 2 dòng không cắt, "Sắp có" / "Mới", stagger 30ms, giảm chuyển động → chỉ mờ 150ms). Ghép xe / ghép trận → trang giữ chỗ `/ghep-xe`, `/ghep-tran` (ComingSoon, noindex). "Tin của tôi" của khách → proxy chuyển `/dang-nhap?next=/toi/tin-cua-toi`
- [x] Banner: scroll-snap (vuốt), chấm vị trí, nút trước / sau (≥ 640, hover / focus), tự chuyển 5s dừng khi hover / focus / tự vuốt / ngoài màn hình / tab ẩn, tắt khi giảm chuyển động, nút dừng / chạy; thẻ chữ theo tone (primary / accent / màu dịch vụ + icon 64), ảnh từ bucket `banners` (`bannerImageUrl`); khung 16:7, chữ dài thì thẻ cao thêm (không cắt). Desktop: banner 2/3 + thẻ cá nhân 1/3 cao bằng nhau
- [x] Thẻ cá nhân 4 biến thể (khách / onboarding — mở LoginDialog, LoginFlow tự vào bước hồ sơ / "Tin của bạn" 3 số + cảnh báo sắp hết hạn → tab active, bị từ chối → tab pending / chưa có tin)
- [x] **Chip Tìm nhanh → bộ lọc thuộc tính trên URL**: `features/listing/filters.ts` nhận tham số whitelist = khoá thuộc tính enum / bool của `ATTRIBUTE_FIELDS` thuộc category đang xét (`?vehicle_type=motorbike`, `?has_loft=1`, `?shift=night`; sai giá trị → bỏ qua) → `searchListings({ attributes })` (cache trang đầu theo cả thuộc tính, "Xem thêm" giữ thuộc tính). Trang danh sách hiện viên thuốc "Có gác ×" để bỏ lọc, giữ thuộc tính qua form tìm và qua chip category khi còn hợp lệ; tính vào `activeFilterCount` (noindex > 2). Key mới `web.listing.remove_filter`
- [x] Dải tin: tiêu đề 44 (ô icon 32, "Xem tất cả ›" có aria-label riêng), 208 / 232 px, desktop 5 thẻ một màn + nút cuộn; skeleton 3 thẻ (desktop 5); "Gần {khu}" rỗng → thẻ mời đăng tin; cả cộng đồng chưa có tin → một `EmptyState`. Cộng đồng (3 số, chỉ khi có tin) + hộp an toàn + thẻ tải app (chỉ khi có `NEXT_PUBLIC_APP_STORE_URL` / `PLAY_STORE_URL`); dòng miễn trừ do layout (MobileDisclaimer / footer)
- [x] Key mới `web.home.{heading,see_all_label,rail_prev,rail_next,get_app_ios,get_app_android}`; bỏ key cũ không dùng (`tagline`, `area`, `utilities_title`, `soon`, `safety_title`, `stats`). Tiện ích CSS `no-scrollbar` (globals.css)
- [x] Đã chụp (Chrome headless, `next start`): 360 / 390 / 768 / 1024 / 1440, sáng + tối, vi / en / zh, khách / đã đăng nhập (có tin, 9+ thông báo, cảnh báo) / chưa hoàn thiện hồ sơ / chưa có tin + interests + khu khác mặc định, hộp chọn khu, lỗi khối (chặn RPC), giảm chuyển động; tràn ngang 0
- [ ] Còn lại: analytics §7 (chờ PostHog), QR tải app trên desktop (cần thư viện QR — chưa hỏi), số thông báo theo Realtime, tag `banners` chưa nằm trong whitelist `/api/revalidate` (admin banner tuần 10 gọi `revalidateTag('banners')` trực tiếp)

## 4. Danh sách trang

| Route | Khu | Render | Tuần |
|---|---|---|---|
| `/` | (app) — Hub | PPR tĩnh + cache 300 (phần người dùng ở client) | 4b Hub; landing marketing tuần 11 |
| `/tinh-nang/[slug]`, `/tai-app`, `/cho-chu-tro`, `/blog/[slug]`, `/gioi-thieu`, `/lien-he`, `/chinh-sach-bao-mat`, `/dieu-khoan`, `/xoa-tai-khoan` | marketing | SSG | 2 khung, 11 |
| `/tin`, `/pass-do`, `/viec-lam`, `/tro`, `/that-lac` | public | SSR + cache 300 | 3 (trang `/[site]`: 4) |
| `/tin/[slug]` | public | cache 300 + tag | 3 (`opengraph-image`: 4) |
| `/u/[id]`, `/tim-kiem` | public | SSR + ISR / dynamic | 4 |
| `/ghep-xe`, `/ghep-tran`, `/nhom/[slug]` | public | SSR + ISR 300 | 7 (giữ chỗ "Sắp có" từ 4b) |
| `/tro` bản đồ + `/tro/[site]` | public | SSR + ISR 300 | 8 |
| `/dang-nhap` | public | dynamic | 2 |
| `/dang-tin` (`?feature=`), `/toi`, `/toi/tin-cua-toi` (`?tab=`), `/toi/tin-cua-toi/[id]/sua`, `/toi/da-luu` | auth | dynamic | 4 (kéo sớm từ 5; `/dang-tin/[category]` thay bằng `?feature=`) |
| `/tin-nhan`, `/tin-nhan/[conversationId]`, `/thong-bao` | auth | dynamic | 6 |
| `/tao-nhom/[kind]`, `/toi/nhom-cua-moi` | auth | dynamic | 7–8 |
| `/toi/huy-hieu`, `/toi/cai-dat` | auth | dynamic | 8 |
| `/admin/login`, `/admin/login/mfa`, `/admin/moderation` | admin | dynamic | 6 |
| `/admin` (dashboard), `/admin/reports`, `/admin/badges`, `/admin/users` | admin | dynamic | 9 |
| `/admin/listings`, `/admin/groups`, `/admin/marketing/*`, `/admin/catalog/*`, `/admin/audit` | admin | dynamic | 10 |
| `/api/revalidate`, `/.well-known/*` | api | handler | 4, 11 |
| `/tin/[slug]/da-go` (410 Gone), `/sitemaps/[file]` | public | handler | 4 |
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
