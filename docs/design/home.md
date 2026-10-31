# Trang chủ (Hub) — đặc tả sản phẩm

Áp dụng cho **app** (`apps/mobile/app/(tabs)/index.tsx`) và **web** (`apps/web` route `/`). Hai bên cùng thứ tự khối, cùng chữ, cùng dữ liệu; chỉ khác cách tương tác của nền tảng (vuốt / kéo làm mới trên app, hover / bàn phím trên web). Khung màn Hub: `apps/mobile/CLAUDE.md` mục 6. Cập nhật: 2026-11-01.

## 1. Mục tiêu

Người lao động mở app là thấy ngay: (1) mọi dịch vụ trong một chạm, (2) tin **gần nơi mình làm**, (3) việc của mình đang dở (tin chờ duyệt, sắp hết hạn), (4) thông báo quan trọng của cộng đồng. Đo bằng: tỉ lệ bấm dịch vụ / dải tin từ Hub, thời gian đến lần bấm đầu tiên, tỉ lệ đăng tin từ thẻ "Tin của bạn".

## 2. Tham khảo

| App | Mẫu lấy | Áp dụng |
|---|---|---|
| Grab | Lưới dịch vụ 4 cột × 2 hàng, ô "Tất cả"; banner ưu đãi trượt ngang; dải "Dành cho bạn" | §4.3, §4.4, §4.7 |
| MoMo | Header chào tên + chuông có số; nhãn "Mới" / "Hot" trên icon dịch vụ; thẻ tài khoản ngay dưới lưới | §4.1, §4.3, §4.5 |
| Shopee | Ô tìm kiếm dính trên cùng khi cuộn; hàng phím tắt danh mục; dải sản phẩm có "Xem tất cả" | §4.2, §4.6, §4.8 |
| Zalo (Khám phá) | Mini-app dạng lưới, ô "Sắp có" mờ; chọn khu vực ở đầu trang | §4.1, §4.3 |

Không lấy: quảng cáo xen giữa nội dung, popup chặn màn khi mở app, tự phát video.

## 3. Bố cục (từ trên xuống)

```
┌───────────────────────────────┐
│ [Ảnh] Chào An          🔔(3)  │  4.1 Header (nền primary, bo cong dưới)
│ 📍 Hòa Phát Dung Quất ▾       │
│ ┌───────────────────────────┐ │  4.2 Ô tìm kiếm (dính trên cùng khi cuộn)
│ │ 🔍 Tìm xe, phòng trọ…     │ │
│ └───────────────────────────┘ │
├───────────────────────────────┤
│ [Pass][Trọ][Việc][Thất lạc]   │  4.3 Lưới dịch vụ 4 × 2 (nổi lên trên header)
│ [Xe ][Trận][Tin tôi][Tất cả]  │
├───────────────────────────────┤
│ ◀ Banner 1 · Banner 2 ▶  ● ○ │  4.4 Banner trượt
├───────────────────────────────┤
│ Tin của bạn: 3 đang đăng …    │  4.5 Thẻ cá nhân
├───────────────────────────────┤
│ (Xe máy)(Điện thoại)(Phòng…)  │  4.6 Tìm nhanh (chip cuộn ngang)
├───────────────────────────────┤
│ Gần Hòa Phát Dung Quất    ›   │  4.7 Gần bạn
│ Dành cho bạn              ›   │  4.7 Theo mối quan tâm
│ Pass đồ / Tìm trọ / …     ›   │  4.8 Dải theo dịch vụ
├───────────────────────────────┤
│ 460 tin · 4 khu · 1.2k người  │  4.9 Cộng đồng + an toàn + tải app (web)
│ Ứng dụng cộng đồng, không…    │
└───────────────────────────────┘
```
Desktop (≥ 1024px): nội dung giữa `max-w-6xl`; lưới dịch vụ 8 ô một hàng; banner + thẻ cá nhân đặt cạnh nhau (banner 2/3, thẻ 1/3); dải tin hiện 5 thẻ.

## 4. Các khối

### 4.1 Header
- **Đã đăng nhập**: avatar (bấm → tab Tôi), `home.greeting` ("Chào {{name}}", tên gọi = từ cuối của họ tên), chuông thông báo kèm số chưa đọc (`countUnreadNotifications`; > 9 hiện "9+"; 0 thì không hiện số). Bấm chuông → màn Thông báo (chưa có → màn "Sắp có").
- **Khách**: logo chữ + nút `auth.sign_in`.
- **Chọn khu** (cả hai): chip `📍 {tên khu} ▾` → sheet / dialog danh sách `sites` (đang hiện). Mặc định: `profile.site` → khu đã chọn lần trước (lưu máy) → khu đầu tiên theo `sort_order`. Đổi khu khi đã đăng nhập → ghi `profiles.site` (`useUpdateProfile`); khách → chỉ lưu máy (MMKV / localStorage). Khu đã chọn dùng cho §4.7 "Gần bạn".
- App: header thu gọn khi cuộn (ẩn lời chào, giữ ô tìm kiếm); tôn trọng Reduce Motion.

### 4.2 Ô tìm kiếm
- Placeholder `common.nav.search_placeholder`. App: bấm → màn Tìm kiếm (focus sẵn). Web: form GET `/tim-kiem?q=`.
- Dính trên cùng khi cuộn qua header (web: `sticky top-0`; app: header thu gọn).

### 4.3 Lưới dịch vụ
- 8 ô, điện thoại 4 cột × 2 hàng, desktop 8 cột. Thứ tự cố định (`HOME_TILES` trong `@hp/shared`): Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc, Ghép xe, Ghép trận, Tin của tôi, Tất cả tin.
- Ô = icon 28 trong nền `bg-service-<x>-soft` bo `rounded-xl` 56×56 + nhãn 1–2 dòng `text-sm` (không cắt chữ).
- Nhãn góc: `home.badge.soon` cho tính năng chưa có (ô mờ 70%, bấm → màn "Sắp có"); `home.badge.new` cho tính năng mới (cờ `isNew` trong `HOME_TILES`).
- Bấm: có haptic nhẹ trên app (không bắt buộc), web hover `-translate-y-0.5`.
- "Tin của tôi": khách → đăng nhập (requireAuth / LoginDialog) rồi vào.

### 4.4 Banner
- Nguồn: bảng `banners` (admin quản lý, `/admin/catalog` tuần 10), placement `app_home` (app) / `web_home` (web), đúng `locale` hoặc `locale = null`, trong khung `starts_at`–`ends_at`, `is_active`, sắp `sort`. Tối đa 5.
- Có ảnh (`image_path` trong bucket `banners`) → ảnh 16:7 phủ kín; không ảnh → thẻ chữ: nền `tone` (màu dịch vụ / primary / accent), `title` đậm, `subtitle`, nút `cta_label`.
- Trượt ngang, chấm vị trí, tự chuyển 5 giây (dừng khi người dùng chạm / hover / focus, tắt khi Reduce Motion); web có nút trước / sau cho bàn phím.
- `link_url`: đường dẫn trong app (`/pass-do`, `/dang-tin`, `/tin/...`) → điều hướng nội bộ (app map sang route tương ứng); `https://` → mở trình duyệt.
- Không có banner → ẩn cả khối (không để trống).

### 4.5 Thẻ cá nhân (chọn 1 theo thứ tự ưu tiên)
1. **Khách**: `home.card.guest_title` + `home.card.guest_body` + nút đăng nhập.
2. **Chưa hoàn thiện hồ sơ** (`needsOnboarding`): `home.card.onboarding_*` → onboarding.
3. **Có tin** (`my_listing_stats`): tiêu đề `home.card.mine_title`; 3 số: đang đăng, chờ duyệt, tổng lượt xem; dòng cảnh báo nếu `expiring_soon > 0` (`home.card.expiring`, bấm → Tin của tôi tab Đang đăng) hoặc `rejected > 0` (`home.card.rejected`, → tab Chờ duyệt); nút `common.actions.post` + `home.card.manage`.
4. **Chưa có tin**: `home.card.first_post_title` + `home.card.first_post_body` + nút đăng tin.

### 4.6 Tìm nhanh
- Chip cuộn ngang từ `HOME_SHORTCUTS` (`@hp/shared`): mỗi chip = nhãn `home.shortcut.<id>` + bộ lọc (feature, categories, attributes, query). Bấm → danh sách của tính năng với bộ lọc đó (web: query string; app: params màn List).
- Bộ khởi đầu: Xe máy, Điện thoại & laptop, Đồ bảo hộ, Đồ gia dụng, Phòng có gác, Ở ghép, Việc ca đêm, Làm thêm ngoài ca, Nhặt được đồ.

### 4.7 Gần bạn / Dành cho bạn
- **Gần {khu}** (`home.near_title`): `searchListings({ site })`, 10 tin, mọi tính năng. Luôn hiện (khu mặc định cho khách).
- **Dành cho bạn** (`home.for_you_title`): chỉ khi đã đăng nhập và `profile.interests` có tính năng Listing → `searchListings({ categories: union(LISTING_FEATURES[interest]) })`, 10 tin, bỏ tin đã có ở "Gần bạn". Không có interests → ẩn.
- Dải: thẻ `ListingCard` layout `grid`, rộng cố định (điện thoại ~208px, desktop 5 thẻ), cuộn ngang có snap, "Xem tất cả" ở tiêu đề.

### 4.8 Dải theo dịch vụ
- Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc (thứ tự `LISTING_FEATURE_ORDER`), mỗi dải 8 tin mới nhất; tiêu đề có icon dịch vụ + "Xem tất cả". Dải rỗng → ẩn.

### 4.9 Chân trang Hub
- Số liệu cộng đồng (`public_stats`): người dùng, tin đang đăng, khu — chỉ hiện khi `listings > 0`.
- Hộp an toàn (`home.safety_title` + `listing.detail.safety_tip`).
- Web điện thoại / desktop: thẻ tải app (store badge + QR desktop) **chỉ khi** có `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL`.
- Dòng miễn trừ `common.disclaimer` (bắt buộc).

## 5. Trạng thái
- Mỗi khối dữ liệu tự có skeleton đúng hình (lưới, banner 16:7, thẻ, dải 3 thẻ); lỗi của một khối chỉ hiện ở khối đó (`ErrorState` gọn + thử lại), không làm hỏng cả trang.
- Toàn bộ không có tin nào → `EmptyState` (`home.empty_title`, `home.empty_body`, CTA đăng tin) thay cho các dải.
- App: kéo xuống làm mới = refetch mọi query của Hub; mở app đọc cache MMKV trước rồi làm mới.
- Web: phần công khai (lưới, banner, dải theo dịch vụ, số liệu) render server + cache (300s, tag `listings` / `banners`); phần theo người dùng (header đã đăng nhập, thẻ cá nhân, Gần bạn theo khu đã chọn, Dành cho bạn, số thông báo) render phía trình duyệt sau khi biết phiên — có skeleton, không làm trang thành dynamic.

## 6. Dễ dùng, hiệu năng
- Vùng chạm ≥ 48 (ô dịch vụ, chip), chữ ≥ 14; mọi icon có nhãn; ô "Sắp có" có `aria-disabled` + nhãn đọc được.
- Banner: vai trò carousel (`aria-roledescription`), nút dừng tự chuyển; không chỉ dùng màu để truyền tải.
- Ảnh thẻ: `imageUrl(…, 'thumb')`; 4 thẻ đầu tiên của dải đầu được tải sớm.
- App: FlashList ngang cho dải > 8 thẻ không bắt buộc (dải cố định ≤ 10); `StaggerItem` cho 8 ô dịch vụ khi tải lần đầu.
- Mục tiêu: Hub TTI p75 < 1,5 s (app), LCP < 2,5 s (web điện thoại).

## 7. Analytics (`track()` app; web khi có PostHog)
`home_view`, `home_tile_click {tile}`, `home_banner_click {banner_id}`, `home_shortcut_click {shortcut}`, `home_rail_click {rail, listing_id}`, `home_rail_see_all {rail}`, `home_site_change {site}`, `home_card_cta {card, action}`.

## 8. Dữ liệu (hợp đồng backend)
| Khối | Nguồn | Gói |
|---|---|---|
| Header số thông báo | `countUnreadNotifications` | `@hp/core` + hook `useUnreadNotificationCount` |
| Chọn khu | `sites`, `profiles.site` | `listSites`, `useUpdateProfile` |
| Lưới dịch vụ | `HOME_TILES` | `@hp/shared` |
| Banner | bảng `banners` + bucket `banners` | `listBanners(client, { placement, locale })`, hook `useBanners` |
| Thẻ cá nhân | RPC `my_listing_stats()` | `getMyListingStats`, hook `useMyListingStats` |
| Tìm nhanh | `HOME_SHORTCUTS` | `@hp/shared` |
| Gần bạn / Dành cho bạn / dải | `search_listings` | `searchListings`, `useListingList` |
| Số liệu | RPC `public_stats()` | `getPublicStats`, hook `usePublicStats` |

## 9. Chữ (namespace `common.home.*`, đủ vi / en / zh)
`greeting`, `greeting_guest`, `site_label`, `site_sheet_title`, `notifications`, `badge.soon`, `badge.new`, `tiles.my_listings`, `tiles.all`, `banner.label`, `banner.prev`, `banner.next`, `banner.pause`, `banner.play`, `banner.slide`, `card.guest_title`, `card.guest_body`, `card.onboarding_title`, `card.onboarding_body`, `card.onboarding_cta`, `card.mine_title`, `card.active`, `card.pending`, `card.views`, `card.expiring_*`, `card.rejected_*`, `card.manage`, `card.first_post_title`, `card.first_post_body`, `shortcuts_title`, `shortcut.<id>`, `near_title`, `for_you_title`, `community_title`, `stats.*`, `safety_title`, `empty_title`, `empty_body`, `get_app_title`, `get_app_body`.

## 10. Thông số giao diện (bắt buộc giống nhau ở app và web)

Chỉ dùng class token (`@hp/tokens`); số trong ngoặc là px. Điện thoại tham chiếu khung 360–430.

**Nền trang**: `bg-bg`. Khối nội dung `px-4`; khoảng cách giữa các khối `gap-6` (24); trong khối `gap-3` (12).

**Header** (§4.1): nền `bg-primary`, chữ `text-on-primary`, bo dưới `rounded-b-xl` (20), padding `px-4 pt-3 pb-16` (pb chừa chỗ cho lưới nổi lên). Hàng 1 (cao 48): avatar `size-10` viền 2px `border-on-primary/30` | cột chữ: lời chào `text-lg font-semibold` + chip khu `text-sm font-medium` nền `bg-on-primary/15` `rounded-full px-3 py-1` icon MapPin 16 + ChevronDown 16 | phải: nút chuông `size-11 rounded-full bg-on-primary/15`, chấm số `min-w-5 h-5 rounded-full bg-accent text-on-accent text-xs font-bold` đặt góc trên phải lệch (-4, -4). Dòng phụ `common.home.subtitle` `text-md opacity-90` dưới lời chào (ẩn khi header thu gọn). Hàng 2: ô tìm kiếm cao 48 `rounded-full bg-surface text-fg shadow-card`, icon Search 20 `text-muted` cách trái 16, chữ placeholder `text-md text-muted`.

**Lưới dịch vụ** (§4.3): thẻ `bg-surface rounded-xl shadow-card p-4 -mt-12` (nổi đè lên header 48px), lưới `grid-cols-4 gap-y-4 gap-x-2` (desktop `grid-cols-8`). Ô: khung icon `size-14` (56) `rounded-lg` nền `bg-service-<x>-soft` (ô tiện ích: `bg-primary-light`, icon `text-primary`), icon 28 `text-service-<x>` stroke 1.75; nhãn `text-sm font-medium text-fg text-center leading-tight` tối đa 2 dòng, khung nhãn `min-h-10`. Nhãn góc: pill `text-xs font-semibold px-1.5 py-0.5 rounded-full` đặt `-top-1.5 -right-1.5` của khung icon — "Sắp có" `bg-surface-2 text-muted`, "Mới" `bg-accent text-on-accent`. Ô sắp có: `opacity-60`. Nhấn: scale 0.97 (`motion.fast`), web hover nền ô `bg-surface-2` `rounded-lg`.

**Banner** (§4.4): `aspect-banner rounded-xl overflow-hidden`, rộng 100% khối (desktop: cột 2/3). Thẻ chữ: nền theo tone — `primary` → `bg-primary text-on-primary`; `accent` → `bg-accent text-on-accent`; dịch vụ → `bg-service-<x>-soft text-fg` + icon dịch vụ lớn 64 `text-service-<x>` ở góc phải dưới (opacity 0.9). Nội dung padding `p-5`: tiêu đề `text-xl font-bold` 2 dòng, phụ đề `text-sm` 2 dòng `opacity-90`, nút CTA `h-9 px-4 rounded-full text-sm font-semibold` (nền tương phản: trên primary/accent dùng `bg-surface text-fg`; trên soft dùng `bg-primary text-on-primary`). Chấm vị trí dưới banner `gap-1.5`, chấm `h-1.5 rounded-full`: hiện tại `w-5 bg-primary`, khác `w-1.5 bg-border`. Tự chuyển 5000 ms, chuyển cảnh `motion.base`.

**Thẻ cá nhân** (§4.5): `bg-surface rounded-xl shadow-card p-4`. Tiêu đề `text-md font-semibold`. Thẻ "Tin của bạn": 3 cột số, mỗi cột: số `text-2xl font-bold text-fg` (chờ duyệt > 0 dùng `text-warning`), nhãn `text-sm text-muted`; ngăn cột `border-l border-border`. Dòng cảnh báo: hàng `rounded-lg px-3 py-2 text-sm` — sắp hết hạn `bg-warning/10 text-fg` icon Clock 16 `text-warning`; bị từ chối `bg-danger/10` icon AlertCircle 16 `text-danger`; có ChevronRight cuối hàng. Hai nút: chính `common.actions.post` (variant accent, `text-on-accent`, icon Plus) + phụ `home.card.manage` (outline), cao 44, chia đôi chiều ngang. Khách / chưa có tin / onboarding: icon minh hoạ 40 trong ô `size-12 rounded-lg bg-primary-light text-primary` bên trái, chữ bên phải, nút dưới (rộng full trên điện thoại).

**Tìm nhanh** (§4.6): tiêu đề khối `text-lg font-semibold`. Chip: cao 40 `rounded-full bg-surface border border-border px-3 text-sm font-medium text-fg`, chấm màu dịch vụ `size-2 rounded-full bg-service-<x>` bên trái chữ; cuộn ngang `gap-2`, mép trái/phải 16 (không dính mép). Nhấn: `bg-surface-2`.

**Dải tin** (§4.7, §4.8): tiêu đề hàng cao 44: ô icon `size-8 rounded-md bg-service-<x>-soft` + icon 20 (dải "Gần bạn" icon MapPin trên `bg-primary-light`, "Dành cho bạn" icon Sparkles trên `bg-accent/15` `text-accent`), tiêu đề `text-lg font-semibold`, phụ đề nhỏ (nếu có) `text-sm text-muted`, phải: `home.see_all` `text-md font-medium text-primary` + ChevronRight 20. Danh sách cuộn ngang `gap-3`, có snap đầu thẻ, padding / scroll-padding 16; thẻ rộng 208 (điện thoại) / 232 (≥ 640) dùng `ListingCard layout="grid"` hiện có. Skeleton: 3 thẻ (`SkeletonListingCard`).

**Cộng đồng + an toàn** (§4.9): hàng số liệu 3 ô `bg-surface rounded-lg shadow-card p-3 text-center` (số `text-xl font-bold text-primary`, nhãn `text-sm text-muted`); hộp an toàn `rounded-lg border border-warning/40 bg-warning/10 p-4` icon ShieldCheck 24 `text-warning`. Dòng miễn trừ `text-xs text-muted text-center`.

**Dark mode**: tất cả qua token (không tự đổi màu). Header dark: `bg-primary` (token dark đã sáng hơn) + `text-on-primary`.

**Chuyển động** (app Reanimated, web CSS; Reduce Motion → chỉ fade 150): lưới ô xuất hiện lần lượt (`motion.stagger`, 8 ô); header thu gọn theo cuộn (lời chào + chip khu mờ dần và dịch lên 8, ô tìm kiếm dính trên cùng); chấm banner co giãn `motion.fast`; chuông lắc nhẹ một lần khi số chưa đọc tăng (không lặp).
