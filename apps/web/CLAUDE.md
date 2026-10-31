@AGENTS.md

# CLAUDE.md — Web (Next.js): Marketing + Người dùng + Admin

> Đặt file này tại `apps/web/CLAUDE.md`. Tài liệu kiến trúc đầy đủ: `docs/ARCHITECTURE.md` (mục 4, 6, 7, 9, 11). Schema và RLS: `supabase/CLAUDE.md`. App mobile: `apps/mobile/CLAUDE.md`. Khi có mâu thuẫn, file này thắng cho phần web.

## 1. Mục đích

Một ứng dụng Next.js duy nhất ở `tenapp.vn`, chạy **song song với app mobile** trên cùng backend Supabase và cùng tài khoản. Người dùng làm được việc chính ngay trên web, không bắt buộc tải app; app chỉ giữ các tính năng cần thiết bị.

| Khu vực | Đường dẫn | Ai dùng | Mục tiêu |
|---|---|---|---|
| **Marketing** | `/`, `/tinh-nang/*`, `/tai-app`, `/blog/*`, trang pháp lý | người chưa biết app | giới thiệu, kéo lượt tải app và lượt dùng web |
| **Người dùng – công khai** | `/tin`, `/pass-do`, `/tro`, `/viec-lam`, `/that-lac`, `/ghep-xe`, `/ghep-tran`, `/tin/[slug]`, `/nhom/[slug]`, `/u/[id]`, `/tim-kiem` | mọi người, Google | xem/tìm tin không cần đăng nhập, **SEO** |
| **Người dùng – đã đăng nhập** | `/dang-tin`, `/tin-nhan`, `/thong-bao`, `/toi/*`, `/dang-nhap` | người dùng | đăng tin, chat, ghép nhóm, quản lý tin |
| **Admin** | `/admin/*` | chủ app + cộng tác viên | kiểm duyệt, người dùng, danh mục, marketing, chỉ số |

App là sản phẩm cá nhân, độc lập, cho cộng đồng người lao động quanh các khu liên hợp Hòa Phát. **Không** dùng logo Hòa Phát; footer luôn có dòng "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát".

6 tính năng, 2 mẫu dữ liệu:

| Tính năng | Mẫu | Category / kind | Route danh sách |
|---|---|---|---|
| Pass đồ | Listing | `pass_electronics`, `pass_vehicle`, `pass_ppe`, `pass_home` | `/pass-do` |
| Tìm trọ | Listing | `room_rent`, `room_share` | `/tro` |
| Tìm việc | Listing | `job_main`, `job_parttime` | `/viec-lam` |
| Đồ thất lạc | Listing | `lost`, `found` | `/that-lac` |
| Ghép xe | Group | `kind = ride` | `/ghep-xe` |
| Ghép trận | Group | `kind = sport` | `/ghep-tran` |

**Quy tắc vàng:** 4 tính năng Listing dùng chung `features/listing`, 2 tính năng Group dùng chung `features/group`; khác biệt chỉ nằm trong `config.ts` của từng tính năng.

## 2. Stack

- Next.js (App Router, bản mới nhất), TypeScript strict, React Server Components mặc định, Server Actions cho ghi dữ liệu
- UI: Tailwind CSS (preset từ `@hp/tokens`) + shadcn/ui, `lucide-react`, `motion` (Framer Motion), `embla-carousel` (gallery ảnh), `vaul` (drawer trên mobile)
- Data: `@supabase/ssr` (session cookie), `@hp/core` (hàm gọi Supabase, query keys, hooks TanStack Query dùng chung với app), TanStack Query cho phần client tương tác
- Form: React Hook Form + Zod (`@hp/shared`)
- Ảnh: `next/image` với loader Supabase Storage transform; nén trước khi upload bằng `browser-image-compression`
- Bản đồ: Goong JS (`@goongmaps/goong-js`), chỉ tải động khi mở bản đồ
- i18n: `next-intl`, file dịch dùng chung `packages/shared/i18n` — `vi` (mặc định), `en`, `zh`
- Admin: TanStack Table, Recharts
- Analytics: PostHog (sau khi đồng ý cookie), Vercel Analytics / Speed Insights; Sentry
- Deploy: Vercel (hoặc Docker trên VPS nếu tự host Supabase)

Không thêm thư viện ngoài danh sách khi chưa hỏi.

## 3. Cấu trúc thư mục

```
app/
├── [locale]/
│   ├── (marketing)/
│   │   ├── layout.tsx                    # header/footer marketing
│   │   ├── page.tsx                      # landing  →  /
│   │   ├── tinh-nang/[slug]/page.tsx
│   │   ├── tai-app/page.tsx              # nhận diện iOS/Android → store, desktop → QR
│   │   ├── cho-chu-tro/page.tsx
│   │   ├── blog/[slug]/page.tsx          # MDX
│   │   ├── gioi-thieu | lien-he | chinh-sach-bao-mat | dieu-khoan | xoa-tai-khoan/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                    # header người dùng (tìm kiếm, Đăng tin, tin nhắn, thông báo, avatar); bottom nav trên mobile
│   │   ├── tin/page.tsx                  # tất cả tin
│   │   ├── pass-do | tro | viec-lam | that-lac/page.tsx        # danh sách theo tính năng (SSR + ISR)
│   │   ├── ghep-xe | ghep-tran/page.tsx
│   │   ├── tin/[slug]/page.tsx           # chi tiết tin, slug = {tieu-de}-{id}
│   │   ├── tin/[slug]/opengraph-image.tsx
│   │   ├── nhom/[slug]/page.tsx          # chi tiết nhóm ghép
│   │   ├── u/[id]/page.tsx               # hồ sơ công khai
│   │   ├── tim-kiem/page.tsx
│   │   ├── dang-nhap/page.tsx            # OTP + Google
│   │   └── (auth)/                       # yêu cầu đăng nhập — proxy.ts chặn
│   │       ├── dang-tin/page.tsx | dang-tin/[category]/page.tsx
│   │       ├── tao-nhom/[kind]/page.tsx
│   │       ├── tin-nhan/page.tsx | tin-nhan/[conversationId]/page.tsx
│   │       ├── thong-bao/page.tsx
│   │       └── toi/{page,tin-cua-toi,nhom-cua-toi,da-luu,huy-hieu,cai-dat}/page.tsx
│   └── admin/
│       ├── login/page.tsx
│       └── (dashboard)/{page,moderation,reports,badges,users,listings,groups,marketing,catalog,audit}/...
├── .well-known/apple-app-site-association/route.ts
├── .well-known/assetlinks.json/route.ts
├── sitemap.ts                            # sitemap index: tĩnh + tin active (chia file 10.000 URL)
├── robots.ts
└── api/                                  # chỉ webhook
src/
├── lib/supabase/{server.ts,client.ts,admin.ts}   # admin.ts = service role, CHỈ dùng trong server action của /admin
├── features/
│   ├── marketing/                        # Hero, ServiceGrid, PhoneMockup, StoreBadges, FAQ, CTA, lead form
│   ├── listing/                          # queries.ts (server), actions.ts, components/ (ListingCard, ListingGrid, Filters, Gallery, ListingForm)
│   ├── pass/ room/ job/ lost-found/      # config.ts
│   ├── group/                            # queries.ts, actions.ts, components/
│   ├── ride/ sport/                      # config.ts
│   ├── chat/                             # client components + Realtime
│   ├── profile/ notifications/ auth/
│   ├── app-only/                         # AppOnly, AppPromoCard, OpenInAppBar
│   └── admin/<tên>/{queries.ts,actions.ts,components/}
├── components/ui/                        # shadcn
├── components/shared/                    # Logo, LocaleSwitcher, ThemeToggle, EmptyState, ErrorState, Skeletons
└── components/admin/                     # DataTable, PageHeader, StatusBadge, ConfirmDialog
content/blog/{vi,en,zh}/*.mdx
proxy.ts                                  # (Next 16, thay middleware.ts) locale + refresh session + chặn (auth) và /admin
```

URL: tiếng Việt không tiền tố, `/en/...`, `/zh/...` (`localePrefix: 'as-needed'`). Slug trong URL luôn tiếng Việt không dấu, lấy từ tiêu đề + id ngắn (`xe-wave-2019-con-dep-a1b2c3`); trang tự redirect 301 nếu slug cũ khác.

## 4. Dùng chung với app (bắt buộc)

| Gói | Nội dung | Web dùng thế nào |
|---|---|---|
| `@hp/core` | hàm gọi Supabase (`listListings`, `getListing`, `createListing`, `joinGroup`...), `keys` query, hooks TanStack Query, `capabilities.ts` | server: gọi hàm với client từ `lib/supabase/server.ts`; client: dùng hooks |
| `@hp/shared` | Zod schemas theo category, enums, i18n `vi/en/zh`, `format.ts` (tiền, ngày, khoảng cách) | validate form + server action, mọi chữ hiển thị |
| `@hp/db` | `database.types.ts` | type |
| `@hp/tokens` | màu, chữ, spacing, radius, motion | preset Tailwind; không khai báo lại |

Luật:
1. **Không viết lại** truy vấn đã có trong `@hp/core`. Thiếu thì thêm vào `@hp/core` (không phụ thuộc React Native, không phụ thuộc Next) rồi dùng ở cả hai nơi.
2. Hàm trong `@hp/core` nhận `SupabaseClient` làm tham số, không tự tạo client.
3. Đổi Zod schema hay enum → sửa ở `@hp/shared`, cả app và web cùng nhận.
4. Một tính năng chỉ "xong" khi chạy trên cả web và app (trừ phần nằm trong `capabilities.appOnly`).

## 5. Luật kiến trúc web

1. Server Component mặc định. `'use client'` chỉ cho: form, chat, bộ lọc tương tác, bản đồ, animation, upload ảnh.
2. **Đọc**: trang công khai đọc trong Server Component qua `features/*/queries.ts` (gọi `@hp/core`). **Ghi**: Server Actions trong `features/*/actions.ts`: Zod → kiểm tra đăng nhập → gọi Supabase (RLS quyết định quyền) → `revalidatePath`/`revalidateTag`.
3. Thao tác nhiều bước (tham gia nhóm, duyệt thành viên, xin huy hiệu, dịch tin) gọi Edge Function, không tự ghép nhiều query.
4. Upload ảnh từ trình duyệt trực tiếp lên Supabase Storage (client đã đăng nhập), nén về cạnh dài 1280px WebP trước; server action chỉ nhận đường dẫn.
5. `features/admin/**`, `components/admin/**`, `lib/supabase/admin.ts` chỉ được import trong `app/[locale]/admin/**` (ESLint `no-restricted-imports`). Trang marketing và người dùng không bao giờ tải code admin.
6. Không đặt logic quyền ở client; nút ẩn/hiện chỉ là UI, server và RLS mới quyết định.
7. Mọi chữ hiển thị qua `next-intl`; thêm key vào cả 3 file `vi/en/zh` (`pnpm i18n:check` phải pass).
8. Không hard-code màu, font, khoảng cách ngoài preset Tailwind từ `@hp/tokens`.

## 6. Render & SEO cho trang công khai

| Trang | Cách render | Cache |
|---|---|---|
| Marketing, blog, pháp lý | SSG | build |
| Danh sách theo tính năng (`/tro`, `/viec-lam`...) | SSR, filter trên search params | trang đầu không filter: ISR 5 phút; có filter: dynamic |
| Chi tiết tin `/tin/[slug]`, nhóm `/nhom/[slug]` | SSR | ISR 5 phút + `revalidateTag('listing:{id}')` khi chủ tin sửa |
| Hồ sơ `/u/[id]` | SSR | ISR 10 phút |
| Khu `(auth)` và `/admin` | dynamic | không cache, `noindex` |

- `generateMetadata` cho mọi trang công khai, đủ 3 ngôn ngữ, `alternates.languages` (hreflang), canonical.
- Tiêu đề trang tin theo mẫu: "{tiêu đề} – {giá} – {khu vực} | {tên app}". Trang danh sách có H1 theo khu vực khi lọc (vd. "Phòng trọ gần KCN Dung Quất").
- Trang khu vực tĩnh cho SEO: `/tro/dung-quat`, `/viec-lam/binh-son`... sinh từ bảng `sites`.
- JSON-LD: `Product`/`Offer` (pass đồ), `JobPosting` (việc làm, có `validThrough`), `Accommodation` (trọ), `Event` (ghép trận), `FAQPage`, `Organization`, `MobileApplication`.
- `opengraph-image.tsx` động cho tin và nhóm (ảnh bìa + giá + khu vực) để chia sẻ Zalo/Facebook đẹp.
- `sitemap.ts` gồm trang tĩnh, trang khu vực, tin `active` (chia nhiều file); **không** có `/admin`, `(auth)`, hồ sơ cá nhân.
- `robots.ts` chặn `/admin`, `/toi`, `/tin-nhan`, `/dang-tin`.
- Tin hết hạn/đã bán: vẫn trả trang (HTTP 200) với nhãn "Đã bán/Hết hạn" + tin tương tự trong 30 ngày, sau đó 410.
- Trang công khai **không** hiện số điện thoại, vị trí chính xác nhà trọ (làm tròn ~300 m), họ tên đầy đủ (chỉ tên + chữ cái họ).

## 7. Khu người dùng

- Đăng nhập: OTP số điện thoại (Supabase Auth) và Google. Khách bấm Liên hệ / Đăng tin / Tham gia → mở dialog đăng nhập rồi quay lại đúng hành động.
- Đăng tin: form nhiều bước giống app (ảnh → thông tin chính → chi tiết theo category → vị trí), tự lưu bản nháp vào `localStorage` (bọc try/catch).
- Chat: danh sách hội thoại + khung chat 2 cột trên desktop, 1 cột trên mobile; Supabase Realtime khi tab đang mở; tin chưa đọc hiện chấm đỏ ở header.
- Thông báo: trang `/thong-bao` đọc bảng `notifications`; không có push trên web.
- Ghép xe / ghép trận: tạo, tìm, xin tham gia, chủ nhóm duyệt — đủ như app.
- Nút "Dịch" trên tin khác ngôn ngữ → Edge Function `translate-content`.

### Tính năng chỉ có trên app (`capabilities.appOnly`)
`push`, `reminders`, `lostFoundInstantMatch`, `liveLocation`, `offlineDrafts`.

- Bọc bằng `<AppOnly feature="reminders">` → trên web hiện `AppPromoCard` đúng ngữ cảnh (vd. sau khi tham gia nhóm ghép xe: "Tải app để được nhắc 60 phút trước giờ đi") có nút store + QR trên desktop.
- `OpenInAppBar`: thanh mỏng trên đầu trang chi tiết khi mở bằng điện thoại, đóng được, nhớ 7 ngày.
- **Không** popup chặn màn hình, không bắt tải app để xem hay dùng tính năng cốt lõi.

## 8. Design & motion

- Token từ `@hp/tokens` (giống app): `primary #0B4F9C` (xanh thép), `primaryLight #E6EFFA`, `accent #F2762E`, `success #1E9E5A`, `warning #E0A100`, `danger #D93025`, `bg #F6F7F9`, `surface #FFFFFF`; gradient thương hiệu `#0B4F9C → #1E6FD9`; màu dịch vụ: pass cam, trọ tím, việc xanh lá, ghép xe xanh ngọc, thể thao đỏ, thất lạc vàng. Dark mode bằng class.
- Font: Be Vietnam Pro (vi/en), Noto Sans SC (zh) qua `next/font`.
- Responsive mobile-first: < 640px giống app (bottom nav 5 mục, nút Đăng nổi giữa), ≥ 1024px header ngang + lưới 3–4 cột, chi tiết tin 2 cột (gallery trái, thông tin + CTA dính phải).
- Card tin, badge, trạng thái nhìn giống app để người dùng chuyển qua lại không bỡ ngỡ.
- Chữ thân ≥ 16px, vùng chạm ≥ 44px, tương phản ≥ 4.5:1, hỗ trợ zoom 200%.
- Motion (`motion`): fade + trượt lên 12–16px khi vào viewport (`once`), stagger 40–60ms; hover card nâng 2px; tim lưu tin nảy; skeleton shimmer; landing có mockup điện thoại nổi nhẹ và số liệu đếm tăng. Tôn trọng `prefers-reduced-motion`. Khu admin chỉ transition 150ms.
- Mọi trang/khối dữ liệu có loading (skeleton qua `loading.tsx` hoặc Suspense), empty (illustration + CTA), error (`error.tsx` có nút thử lại).

## 9. Marketing (`/`)

Landing theo thứ tự: Hero (tiêu đề, 1 câu, 2 nút "Dùng ngay trên web" + "Tải app", QR trên desktop, mockup) → 6 dịch vụ → tin mới nhất (lấy thật từ DB, server render) → cách hoạt động 3 bước → an toàn & tin cậy → số liệu cộng đồng (ẩn khi số còn nhỏ) → cảm nhận người dùng (chỉ phản hồi thật đã xin phép; chưa có thì ẩn, **không** viết lời chứng thực giả) → cho chủ trọ/chủ sân/nhà tuyển dụng → FAQ (JSON-LD) → CTA → footer.

- Form thu lead → Server Action → bảng `marketing_leads` (consent, utm, locale) có rate limit + honeypot.
- Link store gắn UTM; sự kiện PostHog: `cta_web_start`, `cta_store_click`, `qr_view`, `lead_submit`, `open_in_app_click`, `app_promo_click`.
- Trang pháp lý (bảo mật, điều khoản, xoá tài khoản, liên hệ) đủ 3 ngôn ngữ — bắt buộc trước khi lên store.
- Mục tiêu Lighthouse mobile: Performance ≥ 90, SEO 100, Accessibility ≥ 95; LCP < 2.5s, CLS < 0.1 (áp dụng cả trang chi tiết tin).

## 10. Admin (`/admin`)

- `proxy.ts`: chưa đăng nhập → `/admin/login`; không phải `moderator`/`admin` → 403. MFA bắt buộc (mật khẩu + TOTP, hoặc Google có 2FA). Header `X-Robots-Tag: noindex, nofollow`.
- Moderator: kiểm duyệt, báo cáo, huy hiệu, khoá tạm, xem lead. Chỉ admin: cấm vĩnh viễn, đổi vai trò, catalog, nội dung marketing, toàn bộ audit log, xuất dữ liệu.
- Mọi server action admin: Zod → kiểm tra quyền **lại ở server** → thực hiện → ghi `audit_log(actor_id, action, target_type, target_id, meta)` → `revalidatePath` (+ `revalidateTag` trang tin công khai bị ảnh hưởng).
- Không xoá cứng; chỉ đổi trạng thái, `deleted_at`, `is_banned`. Hành động ảnh hưởng người dùng → insert `notifications` (key i18n + tham số).
- Ảnh giấy tờ xác minh: signed URL 5 phút. SĐT che một phần, bấm "Xem" mới hiện và ghi audit log.

| Màn hình | Việc chính |
|---|---|
| Dashboard | người dùng mới/tuần (tách web/app), tin theo danh mục, nhóm, báo cáo mở, thời gian xử lý hàng chờ, lượt vào từ Google, lượt tải app, lead |
| Hàng chờ kiểm duyệt | sắp theo `risk_score`; duyệt / từ chối (lý do mẫu) / sửa danh mục; phím tắt `A` `R` `J` `K`; duyệt hàng loạt |
| Báo cáo | gom theo đối tượng; bỏ qua / ẩn / cảnh cáo / khoá |
| Huy hiệu | duyệt / từ chối |
| Người dùng | tìm, khoá, cấm, đổi vai trò (admin) |
| Marketing | banner (app + web), blog (trạng thái), lead (đánh dấu đã liên hệ, xuất CSV) |
| Catalog | `sites`, `venues`, từ khoá cấm |
| Audit log | lọc, xuất CSV (admin) |

UI admin: shadcn/ui, sidebar thu gọn được, `DataTable` chung (TanStack Table: sort, filter, chọn nhiều, hành động hàng loạt), filter/sort/trang trên URL, `ConfirmDialog` ghi rõ hành động và đối tượng, `StatusBadge` có màu + chữ.

## 11. Quy ước code

- TypeScript strict, không `any`, không `@ts-ignore`.
- Component trong `components/` dạng `kebab-case.tsx`; route theo Next.
- Import alias: `@/lib`, `@/features`, `@/components`, `@hp/core`, `@hp/shared`, `@hp/db`, `@hp/tokens`.
- Commit Conventional Commits: `feat(web-room): bộ lọc giá trọ`, `feat(admin-moderation): ...`.
- Biến môi trường trong `.env.example`; `SUPABASE_SERVICE_ROLE_KEY` không bao giờ có tiền tố `NEXT_PUBLIC_`.
- Đổi schema → migration trong `supabase/` theo `supabase/CLAUDE.md`, không sửa trên Studio.
- Không sửa file ngoài phạm vi được yêu cầu.

## 12. Trước khi báo "xong"

**Chung**
- [ ] Logic dữ liệu nằm trong `@hp/core`, không viết lại ở web; tính năng tương ứng trên app không bị hỏng
- [ ] 3 ngôn ngữ đủ key; light + dark; màn hình 360px và 1440px
- [ ] Loading / empty / error đủ

**Trang công khai**
- [ ] Server render có nội dung trong HTML (tắt JS vẫn đọc được tin)
- [ ] Metadata, canonical, hreflang, OG image, JSON-LD đúng loại
- [ ] Không lộ SĐT, vị trí chính xác, họ tên đầy đủ
- [ ] Lighthouse mobile đạt mục tiêu; không bundle admin trong trang (kiểm tra `next build`)

**Khu người dùng**
- [ ] Middleware chặn đúng; sau đăng nhập quay về đúng hành động
- [ ] Server action: Zod, kiểm tra đăng nhập, revalidate; RLS chặn được khi thử sửa tin người khác
- [ ] Tính năng chỉ có trên app hiển thị `AppPromoCard`, không popup chặn

**Admin**
- [ ] Chặn đúng anon / user / moderator / admin; `noindex`
- [ ] Mọi action ghi `audit_log`; không import `admin.ts` vào client component
