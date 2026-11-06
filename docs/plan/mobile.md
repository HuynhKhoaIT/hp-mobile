# Kế hoạch triển khai — apps/mobile (Expo iOS / Android)

Cập nhật: 2026-11-03 · Nguồn: `docs/ARCHITECTURE.md` (mục 8, 9, 12, 13), `apps/mobile/CLAUDE.md` · Tổng quan: `docs/PLAN.md` · Khu khác: `docs/plan/web.md`, `docs/plan/backend.md`

## 1. Mục tiêu và cổng

| Cổng | Thời điểm | Tiêu chí phần mobile |
|---|---|---|
| 1. Schema + auth chạy | hết tuần 2 | Đăng nhập OTP thật trên thiết bị; ≥ 10 component trong `ui-gallery`; CI (tsc, lint, i18n:check) xanh; EAS dev build cài được |
| 2. Beta 100 người | tuần 6 → 8 | Pass đồ, Việc, Chat, Thông báo, Hồ sơ chạy trên build kênh `staging`; crash < 1%; 5 phỏng vấn người dùng |
| 3. Ra mắt Dung Quất | hết tuần 10 | Đủ 6 tính năng; TTI p75 màn Hub < 1.5s trên Android tầm trung; cold start < 2s; deep link + push đúng |
| 4. Mở rộng khu vực | hết tuần 12 | Lên App Store + Google Play; đủ 3 ngôn ngữ; EAS Update kênh `production`; Sentry + PostHog có dữ liệu |

Chỉ số MVP (ARCHITECTURE mục 1): 5.000 đăng ký, 2.000 tin pass / tháng, quay lại tuần > 30%, crash < 0.5%, app < 40 MB.

## 2. Phụ thuộc chéo

### 2.1 Mobile cần từ backend
| Tuần | Cần sẵn ở backend |
|---|---|
| 1 | Supabase local chạy; `packages/tokens` (preset NativeWind), `packages/db` types, `packages/shared` khung i18n 6 ns |
| 2 | `profiles` + trigger tạo từ `auth.users`; `send-otp`; RLS core; `@hp/core` `SupabaseProvider`, `keys`, `profile.ts` |
| 3 | `listings` + `public_listings`, `search_listings`, `get_listing_by_slug`, `similar_listings`; Storage `listing-images`; `@hp/core` `listings.ts` + hooks; Zod `pass_*`, `job_*`; seed 50 tin / category |
| 4 | `createListing`, `updateListing`, `markSold`, `bookmarks`; `moderate-listing`; rate limit tin / ngày; `reveal_contact` |
| 5 | Chat: bảng + trigger + RLS + Realtime publication; bucket `chat-images`; `@hp/core` `chat.ts` |
| 6 | `notifications` + `send-push` (payload `{screen, params}`); `ratings`; `notification_prefs`; project staging |
| 7 | `groups` + trigger + `public_groups`, `search_groups`, `get_group_by_slug`; `join-group`; Zod ride / sport |
| 8 | `respond-join`, `remind-groups`, `expire-content`; `venues` |
| 9 | Zod `room_*`, `lost` / `found`; `match-lost-found`; khoảng cách tới `sites.location` trong view / RPC |
| 10 | `request-badge` + bucket `verification`; `translate-content` + `listing_translations` |
| 12 | Project production, Auth redirect URLs có `hoaphat://**` |

### 2.2 Mobile cần từ web
| Tuần | Cần sẵn ở web |
|---|---|
| 4 | `/tin/[slug]` chạy để link chia sẻ từ app mở được trang web |
| 11 | `.well-known/apple-app-site-association` và `assetlinks.json` đúng bundle id / fingerprint |
| 12 | `/tai-app` + trang pháp lý 3 ngôn ngữ (bắt buộc cho store listing) |

### 2.3 Khu khác cần từ mobile
- Tuần 6: tên event analytics thống nhất với web (`src/core/analytics/events.ts` ↔ `apps/web/src/lib/analytics/events.ts`).
- Tuần 10: bundle id iOS + Team ID, package name + SHA-256 fingerprint Android gửi web để sinh `.well-known`.
- Tuần 10: ảnh chụp màn hình app cho landing / store.

## 3. Lộ trình 12 tuần

| Tuần | Việc | Đầu ra kiểm chứng được | Skill |
|---|---|---|---|
| 1 | Khởi tạo Expo (SDK mới nhất, TS strict, Expo Router, NativeWind + preset `@hp/tokens`, link `packages/*`); ESLint `no-restricted-imports`; `app/_layout.tsx` providers (Query + persist MMKV, Supabase, Theme, i18n, Toast, BottomSheet, Sentry, PostHog); `src/core/supabase.ts`; font Be Vietnam Pro; `.env.example`; CI; khung `ui-gallery` | `pnpm start` mở Expo Go, gallery trống hiện được, CI xanh | — |
| 2 | Design system bước 1–5 (mục 5); auth flow `phone` → `otp` → `onboarding` 3 bước (chọn ngôn ngữ, tên + avatar, khu + mối quan tâm, bỏ qua được); `requireAuth`; EAS dev build | **Cổng 1** | `/new-ui-component`, `/new-screen` |
| 3 | Design system bước 6–7; `features/listing` engine (types, `useListingList` cursor, Detail, `attributeRenderers`); `features/pass/config.ts`; `(tabs)/index` Hub; `listing/[id]` + alias `tin/[slug]`; `(tabs)/_layout` TabBar | Xem danh sách + chi tiết pass đồ từ seed; shared element ảnh | `/configure-feature` |
| 4 | Form engine (RHF + Zod từ shared, `useDraft`, `useImageUpload` nén + retry); `listing/new/[category]` cho pass; `features/job/config.ts` (list / detail / form); `search`; `(tabs)/post`; bookmark optimistic; `track()` 4 event chính | Đăng tin pass + việc từ app, thấy trên web; "Đăng nhanh" 3 bước | `/optimistic-mutation` |
| 5 | `features/chat`: `(tabs)/chat/index`, `chat/[conversationId]` Realtime, optimistic send, gửi ảnh, trạng thái gửi / lỗi; hướng dẫn giao dịch an toàn lần đầu; sheet Báo cáo / Chặn ở tin, hồ sơ, chat | Chat 1-1 giữa hai máy realtime; tin chưa gửi giữ lại khi mở lại app | `/new-screen` |
| 6 | Push: đăng ký token, `routeForNotification`, màn `notifications`; `(tabs)/me` + `profile/[id]`, tin của tôi, đã lưu, sửa tin, đánh dấu đã bán + chọn người mua + đánh giá; Cài đặt (ngôn ngữ, thông báo); EAS internal build kênh `staging` | **Cổng 2 bắt đầu**: phát build cho 100 người | — |
| 7 | `features/group` engine (types, `GroupCard`, Detail với hàng avatar + join, Form); `features/ride/config.ts`; `MapView` wrapper Goong (lazy), `LocationPicker` có bản đồ + autocomplete; join-group optimistic + animation avatar bay vào; sửa lỗi beta | Tạo / tham gia ghép xe end-to-end | `/configure-feature` |
| 8 | `features/sport/config.ts` + chọn / đóng góp `venues`; host duyệt (`respond-join`); chat nhóm; nhắc 60 phút qua push; đánh giá sau trận; `(tabs)/explore` | **Cổng 2 kết thúc**: 2 tuần beta, > 200 tin, crash < 1% | — |
| 9 | `features/room/config.ts`: chế độ bản đồ cluster, filter khoảng cách tới nhà máy, ≥ 3 ảnh, card trọ; `features/lost-found/config.ts` + match tức thì qua push + "Đã nhận lại" | 6 tính năng chạy trên app | `/configure-feature` |
| 10 | `badge/request` (chụp giấy tờ); nút Dịch; offline: nháp + tin nhắn chưa gửi + hàng đợi upload; coach mark 3 thao tác; nhập giọng nói; perf pass (TTI, 200 item, Sentry Performance) | **Cổng 3**: TTI p75 < 1.5s | `/mobile-done-check` |
| 11 | Rà toàn bộ màn ở `en` / `zh`, font 150%, Reduce Motion, dark, 360px; `accessibilityLabel`; Lottie đăng tin thành công; test Universal / App Links với `.well-known` của web; store assets 3 ngôn ngữ | Checklist mục 12 pass ở mọi màn | `/mobile-done-check` |
| 12 | EAS production build + submit; EAS Update kênh `production`; Sentry release; PostHog dashboard; xoá tài khoản trong app; trang Giới thiệu có dòng "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" | **Cổng 4**: lên store | — |

Thứ tự tính năng theo ARCHITECTURE mục 13: Pass đồ và Việc trước (nhu cầu cao, không cần bản đồ); Ghép xe / Ghép trận / Trọ sau khi lõi ổn.

## 4. Danh sách màn hình

| Route | Kiểu | Feature | Tuần | Mở từ |
|---|---|---|---|---|
| `(auth)/phone`, `(auth)/otp`, `(auth)/onboarding` | Form | auth | 2 | `requireAuth` |
| `(tabs)/index` | Hub | home | 3 → 4 → 4b (super app theo `docs/design/home.md`) | cold start (chuyển vào `(tabs)` ở tuần 4) |
| `listings/[feature]` (`pass` · `room` · `job` · `lost-found` · `all`, `?site=`, `?shortcut=`, `?categories=a,b`) | List | listing | 3 (+ bộ lọc đặt sẵn tuần 4b) | ô dịch vụ ở Hub, "Xem tất cả", chip "Tìm nhanh", link banner |
| `groups/[kind]` (`ride` · `sport`) | List | group | 3 (tạm "Sắp ra mắt") → 7–8 | ô dịch vụ ở Hub |
| `(tabs)/explore` | List | listing (4) + group (8) | 4 / 8 | tab |
| `(tabs)/post` | Hub (chọn loại tin) | — | 4 | tab, nút Đăng xoay 45° |
| `(tabs)/chat/index` | List | chat | 4 (tạm "Sắp ra mắt") → 5 | tab, push `new_message` không có id |
| `(tabs)/me` | Hub | profile | 4 (hồ sơ, tin của tôi, đã lưu, ngôn ngữ, đăng xuất) → 6 | tab |
| `listing/[id]` + alias `tin/[slug]` | Detail | listing | 3 | card, push `listing_*`, `lost_found_match`, URL web |
| `listing/new/[category]` | Form | listing | 4 | post, FAB Đăng |
| `listing/new` (`?feature=`) | Form (bước 0: chọn loại tin) | listing | 4 | FAB Đăng ở danh sách, kết quả "Đăng tin khác" |
| `listing/edit/[id]` | Form | listing | 4 | tin của tôi, chi tiết tin của mình, tin bị từ chối |
| `my-listings` (`?tab=`) | List | listing | 4 | tab Tôi, kết quả đăng tin, chi tiết tin của mình |
| `saved` | List | listing | 4 | tab Tôi |
| `group/[id]` + alias `nhom/[slug]` | Detail | group | 7 | card, push `join_*`, `group_reminder`, URL web |
| `group/new/[kind]` | Form | group | 7 | post |
| `my-groups` (`?tab=upcoming\|past`) | List | group | 8 | tab Tôi |
| `venues/new` (`?sport=`) | Form | group | 8 | ô Sân của form tạo kèo |
| `chat/[conversationId]` | Conversation | chat | 5 | danh sách, push `new_message`, CTA Chat |
| `search` (`?q=`) | List | listing (+ group tuần 8) | 4 | ô tìm kiếm ở Hub |
| `notifications` | List | — | 4b (tạm "Sắp ra mắt") → 6 | chuông ở header Hub, push mở app |
| `profile/[id]` | Detail | profile | 6 | avatar ở tin / chat |
| `settings/index`, `settings/language`, `settings/notifications`, `settings/delete-account`, `settings/about` | Form | profile | 6 / 12 | me |
| `badge/request` | Form | profile | 10 | me |
| `(dev)/ui-gallery` | Hub | — | 1 | chỉ dev |

## 5. Thứ tự design system (tuần 1–3, ARCHITECTURE mục 9.6)
1. `theme.tsx` (ThemeProvider đọc light / dark hệ thống, `useTheme`, `useReducedMotion`) + preset NativeWind từ `@hp/tokens`.
2. `Text`, `Screen`, `Header`, `Row` / `Col` / `Spacer` / `Divider`.
3. `Button`, `IconButton`, `Input`, `Chip`, `Badge`, `Avatar`, `Card`.
4. `Skeleton`, `SkeletonListingCard`, `EmptyState`, `ErrorState`, `Toast`.
5. `BottomSheet`, `Select` / `MultiSelect`, `DateTimePicker`, `PriceInput`.
6. `ImagePicker`, `LocationPicker`, `MapView` (lazy).
7. `ListingCard`, `GroupCard`, `ServiceTile`, `SectionHeader`, `SearchBar`, `FilterBar`, `MessageBubble`, `Rating`, `Fab`, `StaggerItem`, `BookmarkButton`, `StickyCta`, `SuccessScreen`.
8. `ui-gallery` đủ mọi variant; chụp ảnh làm tham chiếu review.

## 5b. Tiến độ tuần 1 (cập nhật 2026-10-31)
- [x] NativeWind **4.2.7** (bản ổn định, Tailwind v3) + preset `@hp/tokens/tailwind.preset` sinh từ token: cùng tên class với web (`bg-primary`, `text-muted`, `bg-surface-2`, `bg-service-pass-soft`…), biến màu `:root` sáng / tối, `inlineRem: 16`. Đã kiểm bằng `expo export --platform android`: stylesheet có `rootVariables` đủ light + dark. NativeWind 5 (Tailwind v4) còn RC → nâng sau, tên class giữ nguyên.
- [x] `src/core`: `env`, `storage` (MMKV v4, 3 instance), `supabase` (session trong MMKV, auto refresh theo AppState, URL polyfill), `query/` (staleTime 60s, persist MMKV 24h, buster theo version), `i18n/` (7 namespace, theo máy rồi lưu MMKV, `setLocale`), `settings` (Zustand: sáng / tối / theo máy), `providers.tsx`.
- [x] `app/_layout.tsx`: font Be Vietnam Pro 4 weight, splash giữ tới khi font xong, `AppProviders` (Gesture, SafeArea, Supabase, Query persist, i18n, BottomSheet).
- [x] `@/ui`: `Text` (variant + tone, font theo weight, zh dùng font hệ thống), `Screen`, `Chip`, `useTheme`, `useReducedMotion`; `app/(dev)/ui-gallery.tsx` (chuyển sáng / tối, vi / en / zh, chữ, màu, màu dịch vụ, Chip).
- [x] ESLint `no-restricted-imports`: cấm `Text` / `Image` / `FlatList` / `SectionList` / `Animated` của react-native; `app/` cấm import supabase.
- [ ] Toast, Sentry, PostHog (`src/core/analytics`, `sentry.ts`) — cần DSN / key.
- [ ] EAS: `eas init` gắn project, development build (MMKV là module native → **không chạy trong Expo Go**, cần dev client).
- Ghi chú phiên bản: Expo SDK 58 đi kèm Reanimated **4.7** (CLAUDE.md ghi Reanimated 3 — API dùng như cũ, worklets tách sang `react-native-worklets`).

## 5c. Tiến độ tuần 2 (cập nhật 2026-10-31)
- [x] Design system bước 2–5: `Header`, `Row` / `Col` / `Spacer` / `Divider`, `Button` (6 biến thể, nhấn 0.97, haptic tuỳ chọn), `IconButton`, `Input` (nhãn, gợi ý, lỗi, suffix), `Checkbox`, `Badge`, `Avatar`, `Card`, `Icon` (Lucide), `Skeleton` (shimmer 1.2s, tắt khi Reduce Motion), `SkeletonListingCard`, `EmptyState`, `ErrorState`, `Toast` (`toast.show`), `BottomSheet`, `Select` / `MultiSelect`, `PriceInput`; tất cả có trong `ui-gallery`
- [ ] `DateTimePicker` — cần `@react-native-community/datetimepicker` (ngoài danh sách stack, hỏi trước); làm cùng form ghép xe tuần 7
- [x] `src/core/auth`: `requireAuth(action)` (lưu hành động, quay lại đúng màn bằng `router.dismissTo`), `continueAfterSignIn`, `finishAuthFlow`, `signOutApp`, `signInWithGoogleApp` (PKCE, `hoaphat://auth/callback`)
- [x] `(auth)/phone` → `otp` (tự xác nhận khi đủ 6 số, gửi lại sau 60s) → `onboarding` 3 bước (ngôn ngữ đổi ngay, tên + đồng ý điều khoản, nơi làm việc + quan tâm, bỏ qua được); màn chính tạm có nút Đăng nhập / Đăng xuất để thử
- [x] Đã kiểm: typecheck, lint, `expo export --platform android` (4313 module, một bản React / TanStack Query / SupabaseProvider)
- [ ] Chạy trên máy thật: cần development build (EAS) — MMKV không có trong Expo Go
- Ghi chú: avatar ở onboarding dời sang tuần 3 cùng `ImagePicker` + bucket `avatars`

## 5d. Tiến độ tuần 3 — xem tin (cập nhật 2026-10-31)
- [x] Design system bước 7 (phần đọc): `ListingCard` (`layout` grid / row; thứ tự khớp web: ảnh 4:3 hoặc ô giữ chỗ màu dịch vụ → badge danh mục + badge ngôn ngữ → tiêu đề 2 dòng → giá 700 → khu + khoảng cách · thời gian), `ListingCover`, `SkeletonListingCard` (grid 2 cột / row / hàng ngang), `SkeletonListingDetail`, `ServiceTile`, `SectionHeader`, `SearchBar`, `FilterBar` (+ `Select trigger="chip"`), `Fab`, `StaggerItem`, `StickyCta`, `Notice`, `ImageGallery`; `Icon service`, `Card padded`, `Badge numberOfLines`, `Chip trailingIcon`; map icon dịch vụ ở `src/ui/service.ts` (Package · House · Briefcase · Search · Car · Trophy). Tất cả có trong `ui-gallery`
- [x] `features/listing` engine: `types.ts` (`ListingFeatureConfig`: categories, color, card.variant, estimatedHeight, filters), `hooks.ts` (`useListingBrowser` — từ khoá / category / khu → `useListingList` cursor + `logSearch`; `usePostListing`, `useContactListing` bọc `requireAuth`; `useShareListing` URL web), `navigation.ts`, components `ListingFeed` (FlashList v2, kéo làm mới, tải trang tiếp khi còn ~5 item), `ListingDetail`, `AttributeList` (`readAttributes`), `OwnerCard`, `ListingRail`
- [x] Config 4 tính năng: `features/{pass,room,job,lost-found}/config.ts` (pass / room lưới 2 cột, job / lost-found thẻ hàng) + `allListingsConfig`
- [x] Hub `app/index.tsx`: chào theo tên, 6 ô dịch vụ (4 Listing → danh sách; ghép xe / ghép trận → "Sắp ra mắt"), "Tin mới quanh {khu}" / "Tin mới đăng" + Xem tất cả, đăng nhập / đăng xuất, dòng miễn trừ, lối vào gallery khi dev
- [x] `listings/[feature]`, `listing/[id]` + alias `tin/[slug]` (Universal Link; không thấy → "Tin không còn"), `groups/[kind]` tạm; Nhắn tin = `requireAuth` → toast (chat tuần 5); Chia sẻ = `https://tenapp.vn/tin/{slug}`; đếm lượt xem `useRecordListingView`
- [x] `@shopify/flash-list` 2.3.2 (bản SDK 58): v2 tự đo item, bỏ `estimatedItemSize` — `card.estimatedHeight` dùng để tính ngưỡng `onEndReached`
- [x] Query không thử lại với lỗi `not_found` / `invalid_input` / `forbidden` / `auth_required` / `banned` (màn "Tin không còn" hiện ngay)
- [x] i18n mới: `listing.owner_badge.{phone,worker,landlord,venue,employer}` (3 ngôn ngữ)
- [x] Đã kiểm: `tsc --noEmit`, `lint`, `i18n:check`, `expo export --platform android` (4398 module, Hermes 8,6 MB)
- [x] Avatar ở onboarding bước 2: `expo-image-picker` (duyệt 2026-10-31) + `expo-image-manipulator` → cắt vuông 512 px WebP ≤ 1 MB → `useUploadAvatar` (`src/features/profile`); quyền thư viện ảnh khai trong `app.json`. Cần dev build mới (thêm module native). Màn hồ sơ / Cài đặt đổi avatar: tuần 6
- [x] Font: import từng độ đậm Be Vietnam Pro (4 file thay vì 18, bundle bớt ~1,9 MB)
- [ ] `(tabs)/_layout` + `TabBar`; ô tìm kiếm ở Hub (khi có màn `search`, tuần 4); header Hub gradient (cần `expo-linear-gradient`, ngoài stack — đang dùng nền `bg-primary`)
- [ ] Shared element ảnh card → chi tiết; event `view_listing` / `contact` (chờ `src/core/analytics` tuần 4); `associatedDomains` / `intentFilters` cho `tenapp.vn/tin/*` (tuần 11)
- [ ] Chạy trên máy thật (dev build): 200 item seed cuộn nhanh, light / dark, 360px, font 150%, Reduce Motion, vi / en / zh

## 5e. Tiến độ tuần 4 — đăng tin, quản lý tin (cập nhật 2026-10-31)
- [x] Thư viện: `react-hook-form` **7.91.0**, `@hookform/resolvers` **6.0.2** (JS thuần, không cần dev build mới). Zustand đã có sẵn.
- [x] Điều hướng: `(tabs)/_layout` (js-tabs của Expo Router SDK 58) + `@/ui/TabBar` tự vẽ — Trang chủ · Khám phá · Đăng (nút cam, xoay 45° khi mở) · Tin nhắn (sắp ra mắt) · Tôi; icon luôn kèm chữ, tab mở nảy nhẹ, Reduce Motion tắt chuyển động. Hub chuyển vào `(tabs)/index` + ô tìm kiếm → `search`. `tin/[slug]` giữ nguyên.
- [x] Form "Đăng nhanh" (một engine `features/listing/form`, khác nhau ở `config.form` + `ATTRIBUTE_FIELDS`): bước 0 chọn loại tin + danh mục (`(tabs)/post`, `listing/new?feature=`) → `listing/new/[category]`: 1 Ảnh (`@/ui/ImagePicker`: chọn nhiều, ảnh bìa, xoá, trạng thái từng ảnh) → 2 Thông tin chính (tiêu đề, hình thức giá + giá — ẩn với việc làm / đồ thất lạc, mô tả) → 3 Chi tiết (attributes: enum chip, số + đơn vị, tiền, ô tích, chữ, ngày mất / nhặt bằng chip "hôm nay … 6 ngày trước"; khu mặc định `profile.site`; khu vực; ngôn ngữ mặc định theo app; nhắc quy định). RHF + `zodResolver(CreateListingInput)`, lỗi inline theo mã `errors.*`, lỗi server nhảy về đúng bước.
- [x] Luồng lưu đúng hợp đồng `@hp/core`: có ảnh → `createListing(draft)` → nén (`src/core/upload`: cạnh dài 1280, WebP q0.8 → 0.6 → 0.4, ≤ 2 MB) + upload lần lượt (tiến độ `form.uploading`, ảnh lỗi giữ lại + "Tải lại ảnh lỗi") → `updateListing(images, status)`; không ảnh → `createListing(active)`. Lưu nháp = giữ `draft` → "Tin của tôi / Nháp". Màn kết quả theo `status` thật: active / pending_review (+ lý do `manage.reason.*`) / rejected. Haptic nhẹ khi đăng thành công.
- [x] Sửa tin `listing/edit/[id]`: cùng form, điền từ `getMyListing` (chờ bản mới nhất), giữ ảnh cũ, upload ảnh mới, `removeListingImages` ảnh bỏ; tin nháp: Lưu nháp / Đăng tin; tin đã đăng: "Lưu thay đổi" ở mọi bước, không gửi `status`. Rời form khi đang soạn → BottomSheet "Bỏ tin đang soạn?" (`usePreventRemove`; iOS tắt vuốt quay lại khi dirty; Android Back lùi bước).
- [x] Tự lưu bản đang soạn cục bộ (`src/core/offline` `useDraft`, Zustand + MMKV, debounce 500ms, app-only `offlineDrafts`); mở lại form → "Đã mở lại tin bạn đang soạn dở" + "Soạn lại từ đầu"; xoá khi lưu xong / bỏ tin.
- [x] "Tin của tôi" (`my-listings?tab=`): tab Đang đăng / Chờ duyệt / Nháp / Đã đóng, dòng có ảnh bìa, badge trạng thái (`LISTING_STATUS_TONE`), giá, hết hạn, lượt xem, ghi chú chờ duyệt / bị từ chối + lý do; BottomSheet thao tác: Sửa, Đánh dấu đã bán (pass / trọ, có xác nhận), Đóng tin, Mở lại (đã bán / đóng), Gia hạn (≤ 3 ngày hoặc hết hạn), Xoá (có xác nhận). Ẩn mở lại với chờ duyệt / bị từ chối / hết hạn. Toast `manage.*`.
- [x] Chi tiết tin: trái tim lưu tin (`@/ui/BookmarkButton`, nảy 1 → 1.3 → 1, khách → đăng nhập, toast), "Hiện số điện thoại" → "Gọi 0912 345 678" (`tel:+84…`) / `contact.no_phone`, banner tin đã bán / đóng / hết hạn (`listingDisplayStatus`) và ẩn liên hệ; chủ tin thấy Sửa tin + Tin của tôi.
- [x] "Tin đã lưu" (`saved`), tìm kiếm (`search?q=`, tab Khám phá) dùng chung `ListingBrowser` (log_search + event `search`). Tab Tôi: hồ sơ (đổi ảnh đại diện), Tin của tôi, Tin đã lưu, ngôn ngữ (ghi `profiles.locale`), đăng xuất.
- [x] `src/core/analytics` (`track`, `events.ts`): `view_listing`, `contact` (chat / reveal_phone / call), `create_listing`, `search`, `save_listing`, `share_listing` — chưa gửi đi đâu cho tới khi có PostHog key (`setAnalyticsSink`).
- [x] Design system: `BookmarkButton`, `ImagePicker`, `SuccessScreen`, `MenuItem`, `TabBar`; `Notice` (tone danger, title, children), `SearchBar` dạng nút, `ServiceTile selected`, `Screen tab`. Gallery có đủ (trừ `TabBar` — xem trong app).
- [x] i18n mới (3 ngôn ngữ): `listing.form.{basics_title, photo_failed, draft_restored, start_over, today, yesterday, site_none, suffix.*}`, `common.nav.search`, `common.settings.language`.
- [x] Đã kiểm: `tsc --noEmit`, `lint`, `i18n:check`, `expo export --platform android` (4435 module, Hermes 9,1 MB); chạy thử luồng dữ liệu với Supabase local (OTP 0900000001): nháp → upload 2 ảnh → đăng (về `pending_review` vì `low_price`), việc làm không ảnh → `active`, lưu nháp đồ thất lạc, lỗi Zod `too_short` / `price_required`, 4 tab tin của tôi, sửa giá + bỏ ảnh + dọn Storage, đóng / mở lại, gia hạn → `too_early`, lưu / bỏ lưu + tin đã lưu, hiện SĐT.
- [ ] Chạy trên máy thật (dev build): chọn nhiều ảnh, nén WebP, upload mạng yếu, bàn phím che ô nhập, vuốt quay lại iOS, Android Back; light / dark, 360px, font 150%, Reduce Motion, vi / en / zh.
- [ ] Lottie confetti khi đăng thành công (chưa cài `lottie-react-native`); shared element ảnh. (Header Hub thu gọn khi cuộn: xong ở 5f.)
- [ ] Hàng đợi upload lũy thừa 5 lần (rule `src/core/upload`): hiện dùng retry 2 lần của `useUploadListingImage` + nút thử lại từng ảnh.

## 5f. Trang chủ super app — `docs/design/home.md` (cập nhật 2026-11-01)
- [x] `(tabs)/index` dựng lại theo §3–§10, route chỉ ghép khối; logic ở `src/features/home` (`hooks.ts`: `useHomeSite`, `usePersonalCard`, `useHomeRails`, `useHubRefresh`, `useHubScroll`, `useHomeViewEvent`; `navigation.ts`: `openTile`, `openShortcut`, `openWebLink`, `openNotifications`; `components/`: `HomeTopBar`, `HomeServices`, `HomeBanners`, `PersonalCard`, `QuickSearch`, `HomeRail`, `HomeListings`, `HomeFooter`).
- [x] Header: nền primary bo `rounded-b-xl`, tràn lên dải trạng thái (`Screen statusBar="primary"`, thanh trạng thái chữ sáng / tối theo giao diện khi tab đang mở); đã đăng nhập: avatar viền on-primary/30 (→ tab Tôi) + "Chào {tên gọi}" + dòng phụ + chuông (số chưa đọc, > 9 → "9+", lắc một lần khi tăng); khách: logo chữ + Đăng nhập; chip khu → sheet chọn khu (`OptionSheet`; mặc định `profile.site` → khu lưu máy `useSettings.homeSite` → khu đầu tiên; đổi khi đăng nhập ghi `profiles.site`, hiện ngay trong lúc ghi). Chip khu đặt hàng riêng dưới hàng chào (tên khu dài như "Khu liên hợp Hòa Phát Dung Quất" không phải xuống dòng) — web nên làm giống.
- [x] Thu gọn khi cuộn (Reanimated, UI thread): lời chào + chip khu mờ dần và dịch lên 8 (Reduce Motion: chỉ mờ); ô tìm kiếm dính trên cùng (`stickyHeaderIndices`), nền xanh kéo dài lên trên cho iOS kéo làm mới.
- [x] Lưới 8 ô (`HOME_TILES`) nổi đè đáy header 48: `ServiceTile variant="grid"` + `ServiceGrid` 4 cột; nhãn góc "Sắp có" / "Mới"; ô sắp có mờ 60% (nhãn góc vẫn rõ), đọc "đã tắt", bấm → màn "Sắp ra mắt"; "Tin của tôi" → `requireAuth`; xuất hiện lần lượt (`StaggerItem`).
- [x] Banner (`useBanners('app_home', locale)`): `BannerCarousel` tràn mép, snap đầu slide, khung tối thiểu 16:7, slide chữ theo tone (primary / accent / dịch vụ + icon 64), slide ảnh (`bannerImageUrl`), chấm co giãn, tự chuyển 5 s (dừng khi chạm / rời tab / nút dừng; tắt khi Reduce Motion), link nội bộ map qua `routeForWebPath` (`src/lib/urls.ts`), `https://` → trình duyệt; không có banner → ẩn khối.
- [x] Thẻ cá nhân 4 biến thể (khách / hoàn thiện hồ sơ / "Tin của bạn" với `StatColumns` + `AlertRow` sắp hết hạn → tab Đang đăng, bị từ chối → tab Chờ duyệt / chưa có tin) — `PromoCard`.
- [x] Tìm nhanh: `Chip size="sm" dot` từ `HOME_SHORTCUTS` → `listings/[feature]?shortcut=` (bộ lọc category + attributes đặt sẵn, hiện thành chip bỏ được; một category con → chọn luôn chip con).
- [x] Dải: "Gần {khu}" (luôn hiện; rỗng → thẻ mời đăng gọn), "Dành cho bạn" (theo `profile.interests`, bỏ tin trùng, → `?categories=`), 4 dải dịch vụ (rỗng → ẩn); `SectionHeader` có ô icon / phụ đề / ChevronRight; thẻ 208 (`w-52`) snap; 4 ảnh đầu dải đầu `priority="high"`; Hub chưa có tin nào → một `EmptyState`.
- [x] Chân trang: số liệu cộng đồng (`StatTile`, chỉ khi có tin), hộp an toàn (`Notice variant="bordered"`), dòng miễn trừ.
- [x] Trạng thái từng khối: skeleton đúng hình (header, banner 16:7 + chấm, thẻ cá nhân, dải 3 thẻ, số liệu), `ErrorState compact` + thử lại chỉ ở khối lỗi; kéo xuống làm mới mọi query của Hub (query theo người dùng chỉ khi đã đăng nhập); cache MMKV đọc trước.
- [x] Analytics (`events.ts`): `home_view`, `home_tile_click`, `home_banner_click`, `home_shortcut_click`, `home_rail_click`, `home_rail_see_all`, `home_site_change`, `home_card_cta`.
- [x] Design system mới / mở rộng (đều có trong ui-gallery): `HomeHeader` + `HomeHeaderSearch` + `HomeHeaderCurve` + `SiteChip` + `NotificationBell`, `BannerCarousel`, `ServiceTile variant="grid"` + `ServiceGrid`, `StatColumns`, `StatTile`, `AlertRow`, `PromoCard`, `OptionSheet`; `Text` (variant `micro` 12, `titleLg` 20, prop `weight`), `Chip` (`size="sm"`, `dot`), `SectionHeader` (`icon`, `subtitle`, `chevron`), `SearchBar variant="elevated"`, `Button` (`inverse`, `shape="pill"`), `ErrorState` / `EmptyState` `compact`, `Notice variant="bordered"`, `Screen` (`statusBar`, `onScroll`, `stickyHeaderIndices`, `onRefresh`), `Skeleton itemClassName`, `ListingCard imagePriority`, `Badge` không tràn thẻ.
- [x] i18n mới: `common.actions.clear_filter` (3 ngôn ngữ). Màn mới `notifications` (tạm "Sắp ra mắt").
- [x] Đã kiểm: `tsc --noEmit`, `lint`, `i18n:check`, `expo export --platform android` (4453 module, Hermes 9,2 MB); chụp bản xem trước web (react-native-web, chỉ để rà giao diện) khách / đã đăng nhập / chưa onboarding / có "Dành cho bạn", sáng / tối, 360 / 390, vi / en / zh, header đang thu gọn.
- [ ] Máy thật (dev build): tự chuyển banner + snap, kéo làm mới, header dính trên Android, lắc chuông, thanh trạng thái, font 150%, Reduce Motion, TalkBack / VoiceOver.

## 5g. Tiến độ tuần 5 — chat 1-1, báo cáo / chặn (cập nhật 2026-11-02)
- [x] `(tabs)/chat/index` hộp thư (skeleton, rỗng, lỗi, khách → đăng nhập, kéo làm mới, cursor), chấm số chưa đọc trên tab (`TabBar` prop `badges`), realtime hộp thư (`useInboxRealtime` ở layout tab)
- [x] `chat/[conversationId]`: header + thẻ tin ngữ cảnh, `MessageBubble` (đang gửi / đã gửi / đã xem / lỗi → chạm gửi lại), phân cách ngày, gộp tin liền nhau, đang nhập… (Broadcast), gửi ảnh (nén WebP ≤ 2 MB, signed URL), tin chưa gửi giữ qua lần mở app (cache persist)
- [x] Lọc nội dung: có SĐT → báo ngay, không gửi; server chặn SĐT lách / từ thô tục → gỡ bong bóng, trả chữ về ô nhập + lỗi dưới ô
- [x] Hướng dẫn giao dịch an toàn lần đầu (`useChatSafety`, MMKV); CTA "Nhắn tin" ở chi tiết tin (`useOpenConversation`); Báo cáo tin (cờ trên header), Tuỳ chọn hội thoại (tắt thông báo, báo cáo, chặn / bỏ chặn); `@/core/report` dùng chung
- [x] UI mới: `MessageBubble`, `Composer`, `ConfirmSheet`, `ReportSheet`, `ChatScrollView` (+ ui-gallery); `IconButton` variant `primary`; `Avatar` lấy chữ cái tên gọi cho tên rút gọn "An N."
- [x] Bàn phím: `react-native-keyboard-controller` (duyệt 2026-11-02) — `KeyboardProvider`, `Screen keyboard` (KeyboardAvoidingView / KeyboardAwareScrollView), chat dùng `KeyboardChatScrollView` + `KeyboardStickyView`
- [x] Đã thử trên Expo web khổ 390 px với Supabase local: hộp thư, gửi / nhận realtime giữa hai trình duyệt, đang nhập…, chặn SĐT / từ thô tục
- [ ] Máy thật (dev build mới — thêm module native keyboard-controller): bàn phím iOS / Android, gửi ảnh, sheet Tuỳ chọn / Báo cáo / Chặn (bản web không mở được sheet bằng chạm — kể cả sheet chọn khu ở Hub có từ trước), light / dark, font 150%
- [ ] "Đã xem" phía người gửi chưa realtime (cập nhật khi mở lại); chưa bắt SĐT đọc bằng chữ

## 5h. Tiến độ tuần 6 — push, thông báo, hồ sơ (cập nhật 2026-11-02)
- [x] `expo-notifications` (stack đã duyệt) + plugin `app.json`; `src/core/notifications`: kênh Android `default`, xin quyền "mềm" (`PushPermissionCard` — bấm mới hỏi, bị từ chối hẳn → mở Cài đặt máy), đồng bộ token khi đăng nhập / token đổi (`register_push_token`), gỡ token trước đăng xuất, không hiện banner cho hội thoại đang mở, bấm push (kể cả mở từ trạng thái tắt) → `routeForNotification` (`routeForNotification.ts`)
- [x] `notifications`: danh sách thật (dịch khoá ns `push` + params, icon theo loại, chấm chưa đọc, đánh dấu tất cả, kéo làm mới, cursor), realtime chuông (`useNotificationsRealtime` ở providers)
- [x] `settings/notifications`: bật / tắt push theo 4 nhóm (optimistic, lưu `notification_prefs`), `ToggleRow` mới (+ ui-gallery)
- [x] `profile/[id]`: hồ sơ công khai (đánh giá, khu, huy hiệu, tin đang đăng) + Báo cáo / Chặn; mở từ người đăng ở chi tiết tin, header chat; tab Tôi có Thông báo + Thông báo đẩy
- [x] Đã thử trên Expo web 390 px với Supabase local: danh sách thông báo, tắt nhóm "Tin nhắn" lưu DB, hồ sơ, tab Tôi
- [ ] Push thật trên máy: cần `eas init` (projectId) + `EXPO_ACCESS_TOKEN` + dev build mới (module native `expo-notifications`, `react-native-keyboard-controller`)
- [ ] Còn của tuần 6 theo kế hoạch: đánh dấu đã bán + chọn người mua + đánh giá (cần RPC `ratings`), EAS build kênh `staging`

## 5i. Tuần 7 — ghép xe / ghép trận (cập nhật 2026-11-02)
- [x] Engine `src/features/group` (quy tắc vàng: ride / sport chỉ khác `config.ts`): `types.ts` (`GroupFeatureConfig`: kind, subKinds, màu dịch vụ, bộ key chữ, card, form `place: 'route' | 'venue'`, số chỗ / duyệt mặc định, `detail.ctas`, `reminderMinutes`), `hooks.ts` (bộ lọc, `requireAuth`, toast `errors.<code>`, haptic khi tham gia, Share URL web, event `join_group`), `navigation.ts`; registry `GROUP_CONFIGS` trong `features/configs.ts`; `features/ride/config.ts`, `features/sport/config.ts`
- [x] `groups/[kind]`: tìm theo chữ, lọc khoảng ngày (Hôm nay / Ngày mai / 7 ngày tới) + loại con, FlashList `GroupCard`, skeleton / rỗng (CTA Tạo) / rỗng khi lọc / lỗi, kéo làm mới, cuộn vô hạn (cursor), FAB Tạo (khách → đăng nhập). Ô Ghép xe / Ghép trận ở Hub mở danh sách này
- [x] `group/[id]` + `nhom/[slug]` (Universal Link, hiển thị trực tiếp như `tin/[slug]`): badge loại / trạng thái / cách tham gia, `RouteSummary` (thay bản đồ), giờ / số chỗ / chi phí, hàng thành viên, thông tin thêm, ghi chú, mẹo an toàn, người tạo (→ hồ sơ), Chia sẻ `tenapp.vn/nhom/{slug}`, Báo cáo (ẩn với chủ nhóm). Thanh dính đáy theo vai trò: khách / chưa tham gia → Tham gia (vào ngay) hoặc Xin tham gia (sheet lời nhắn); đã xin → Rút yêu cầu; thành viên → Rời nhóm; chủ nhóm → yêu cầu chờ duyệt (Nhận / Từ chối optimistic) + Huỷ nhóm (ConfirmSheet). Realtime khi là chủ nhóm / thành viên / đang chờ duyệt
- [x] Hiệu ứng tham gia: avatar của mình bay vào `AvatarStack` (spring `motion.base`), số chỗ đếm ngược (`Ticker`); Reduce Motion → fade 150ms
- [x] `group/new/[kind]`: một trang (loại → điểm đi mặc định "Cổng <khu>" + điểm đến gõ tay / chọn nhanh `RIDE_PLACES`, hoặc sân → ngày giờ → số chỗ (xe máy ≤ 2) → chi phí → tiêu đề (ghép xe để trống tự đặt "A → B") → ghi chú → duyệt người tham gia → thông tin thêm theo `GROUP_ATTRIBUTE_FIELDS`), resolver chạy `CreateGroupInput` của `@hp/shared`, lỗi dưới đúng ô, nháp cục bộ (`useDraft`), hỏi trước khi bỏ, màn chúc mừng "Xem nhóm"
- [x] `src/ui` mới (+ ui-gallery): `GroupCard` / `SkeletonGroupCard` / `SkeletonGroupDetail` (thứ tự khớp web: badge → tiêu đề → giờ → tuyến → chỗ + chi phí → avatar / người tạo; tone trạng thái `GROUP_STATUS_TONE`), `AvatarStack`, `Ticker`, `RouteSummary`, `Stepper`, `DateTimePicker` (Android: hộp thoại hệ thống; iOS: sheet; Expo web: sheet chip ngày / giờ 15 phút)
- [x] Thư viện `@react-native-community/datetimepicker` (duyệt 2026-11-02, cần dev build mới)
- [x] Push `join_request` / `join_accepted` / `join_declined` / `group_cancelled` → `routeForNotification` mở `group/[id]`; icon riêng ở danh sách thông báo; link web `/nhom/{slug}` trong banner → màn nhóm
- [ ] Bản đồ / gợi ý địa chỉ: chờ key Goong (`src/ui/MapView`, `LocationPicker`); điểm đi chưa có toạ độ khu (`listSites` chưa trả `sites.location`)
- [x] Chat nhóm, danh mục sân (venues), nhắc giờ đi (`group_reminder` qua cron + push; gợi ý ở chi tiết) — xong ở tuần 8 (5j)
- [ ] Sửa nhóm (`useUpdateGroup` có sẵn, chưa có màn)
- [ ] Thử trên máy thật iOS + Android (dev build mới vì thêm module native)

## 5j. Tuần 8 — sân, chat nhóm, đánh giá, Nhóm của tôi (cập nhật 2026-11-02)
- [x] Chọn sân ở form tạo kèo (`config.form.place = 'venue'`, engine `features/group/form/VenueField`): tìm sân (bấm Tìm mới gọi `useVenues`, lọc theo môn đang chọn + khu của hồ sơ, tối đa 8) → thẻ sân (tên, địa chỉ, giá tham khảo `formatMoney`, môn) → chọn = `venue_id` + `origin_text` tên sân (+ toạ độ sân); "Sân khác (tự nhập)" → ô chữ, `venue_id` null; "Đổi sân"; đổi môn mà sân không có → bỏ sân. Nháp (`useDraft`) giữ cả sân đã chọn; lỗi `invalid_venue` về ô Sân. Kèo mới không còn điểm đi mặc định "Cổng <khu>"
- [x] `venues/new` (Form, `?sport=`): góp sân mới — RHF + `zodResolver(ContributeVenueInput)`, môn chọn sẵn, lỗi dưới ô (`phone_invalid`…) / toast, gửi xong toast `venue.submitted` và quay lại form kèo (nội dung còn nguyên)
- [x] `group/[id]`: tên + địa chỉ sân (`venue_name` / `venue_address`); nhãn "Đang diễn ra" cho `in_progress` (cả `GroupCard`, `useGroupTexts().status`); gợi ý "được nhắc trước N phút" cho chủ nhóm / thành viên (`config.reminderMinutes` = `GROUP_RULES.reminderMinutes`); thanh dính đáy chủ nhóm / thành viên có "Chat nhóm" (`config.detail.ctas` thêm `'chat'`, `GroupChatButton` → `useGroupConversationId` → `useOpenConversation().openGroupChat`) cạnh Rời / Huỷ; thành viên sau giờ hẹn: khối đánh giá (`GroupRatingCard`: "Đánh giá" → `GroupRateSheet` 5 sao + nhận xét → `useRateGroup` optimistic → toast `rate.done`; đã chấm → "Bạn đã chấm N/5")
- [x] Chat nhóm (`features/chat`): hộp thư — ô icon màu dịch vụ, tên nhóm, "N thành viên", xem trước "Tên: tin" (`chat.inbox.sender`); header — tên nhóm + số thành viên / đang nhập → chạm mở nhóm, dải ngữ cảnh (giờ hẹn + trạng thái + Xem nhóm); bong bóng người khác có tên (đầu chuỗi) + avatar nhỏ (cuối chuỗi) từ `useConversationMembers`; Tuỳ chọn chỉ còn tắt thông báo + "Báo cáo nhóm" (không chặn); rỗng → `group.chat.empty`
- [x] `my-groups` (List, `?tab=upcoming|past`, mở từ tab Tôi): `useMyGroups(tab)`, `GroupCard` có badge vai trò (`roleLabel` mới), nhóm đã xong + đã được nhận + chưa chấm → nút "Đánh giá" dưới thẻ (cùng `GroupRateSheet`), đã chấm → sao + điểm; rỗng có CTA Tìm chuyến xe / Tìm kèo; skeleton, lỗi thử lại, kéo làm mới, cursor
- [x] Thông báo: icon `group_completed` (sao); `group_reminder` / `group_completed` → chi tiết nhóm, `listing_expiring` → chi tiết tin (chủ tin gia hạn ở Tin của tôi); chữ in-app dịch từ khoá `push` (`group_reminder.body_ride|sport`, `new_message.group_*`) như các loại cũ
- [x] `(tabs)/explore`: khi chưa tìm / lọc, đầu danh sách có dải ngang Ghép xe + Ghép trận (`GroupRail`, ≤ 6 thẻ, "Xem tất cả" → `groups/[kind]`, ẩn khi rỗng, lỗi gọn) rồi tiêu đề "Tin mới đăng"
- [x] `src/ui` (+ ui-gallery): `StarRating` mới (chọn: radio từng sao ≥ 44, không haptic; chỉ xem: một nhãn), `Icon filled`, `GroupCard roleLabel`, `MessageBubble author / showAuthor / showAvatar`
- [x] i18n mới (3 ngôn ngữ): `group.detail.reminder_hint`, `chat.inbox.sender`; `tsc`, `lint`, `i18n:check` xanh
- [x] Ghép trận với đội có sẵn (2026-11-03): `config.form.lineup` (sport `true`, ride `false`) → form có công tắc "Đội đã có sẵn người" + `Stepper` `attributes.players_have` (tính cả chủ nhóm, 1..`GROUP_RULES.maxSeats`, mặc định 1) ngay dưới "Số người cần thêm", xem trước `form.lineup_preview`; tắt → bỏ khoá; nháp giữ nguyên, lỗi Zod dưới ô. `GroupCard` (`useGroupTexts().cardSeats`) hiện "Đã có 6/7 người · cần thêm 1" thay "Còn N chỗ" (đủ người giữ "Đã đủ người"), chi tiết thêm dòng "Đội hình" dưới số chỗ — cùng `groupLineup()` của `@hp/shared`; i18n mới `group.form.players_have_increase|decrease`; ui-gallery có 2 thẻ mẫu
- [ ] Chưa thử trên máy thật; trên Expo web sheet (`BottomSheet`) có thể không mở bằng chạm (đã ghi ở 5g) → sheet đánh giá cần thử trên dev build
- [ ] Chọn sân chưa dùng GPS (`useVenues` nhận lat / lng — chưa có `src/core/location`) nên chưa sắp theo khoảng cách; chưa có bản đồ sân / "Gọi sân" (`PublicGroup` không có SĐT sân)
- [ ] Tìm kiếm (`search`) chưa có nhóm; sửa nhóm (chọn lại sân) chưa có màn

## 5k. Tuần 9–10 — trọ, đồ thất lạc, gợi ý, huy hiệu, dịch, xoá tài khoản (cập nhật 2026-11-03)
- [x] **Tìm trọ** (`features/room/config.ts`, engine mở rộng cho mọi tính năng): filter mới `'distance'` (`ListingFilterKey`) → hàng chip thứ hai "Mọi khoảng cách / Dưới 1 / 2 / 5 km" (`config.distanceOptionsKm`, mặc định `DISTANCE_OPTIONS_KM`) → `maxDistanceM` của `useListingList` (tin không có vị trí bị loại; tính vào "đang lọc" → rỗng là "không tìm thấy"). Thẻ đã có "Cách <khu> <khoảng cách>" (`useSiteText`, `formatDistance`) từ tuần 3. Ảnh tối thiểu: `config.form.minPhotos` (trọ = `LISTING_IMAGES.roomMin` 3) — bước Ảnh nhắc "Cần ít nhất 3 ảnh", bấm Đăng / Lưu thay đổi khi thiếu → về bước Ảnh, nhắc chuyển tông lỗi + toast; Lưu nháp vẫn được (Zod `CreateListingInput` / DB **chưa** kiểm số ảnh theo category — chỉ chặn ở client)
- [x] **Đồ thất lạc** (`features/lost-found/config.ts` `detail.lostFound`; `ListingDetailState` nhận `configOf` = `configOfCategory` từ route `listing/[id]`, `tin/[slug]`): chủ tin mất / nhặt đang hiện, chưa nhận lại → khối "Tin có thể khớp" (`useLostFoundMatches`, ≤ 5 thẻ hàng, skeleton / lỗi gọn Thử lại / rỗng `matches_empty`) + nút "Đã nhận lại đồ" ở thanh dính đáy (Sửa tin chuyển outline) → `ConfirmSheet` → `useMarkReturned` → `useMarkListingReturned` (RPC một giao dịch: `attributes.returned = true` + đóng tin) → toast `returned_done`. Tin đã nhận lại: nhãn success "Đã trả lại" ở `ListingCard` (`isReturned` trong `lib/listing.ts`) + chi tiết (badge + Notice thay cho banner "đã đóng"). Push `lost_found_match` (screen `listing`, id = tin kia) đã đi qua `routeForNotification` → chi tiết tin; icon `SearchCheck` ở danh sách thông báo
- [x] **Hub "Dành cho bạn"**: `useHomeFeed({ site, limit: 20 })` thay tìm theo `profile.interests` — chỉ khi đã đăng nhập (khách nhận đúng thứ tự "Gần bạn" nên ẩn), bỏ tin trùng "Gần bạn", tối đa 10, phụ đề mới `home.for_you_feed_hint`, "Xem tất cả" → mọi tin lọc theo các loại tin đang gợi ý. `docs/design/home.md` §4.7 còn ghi theo interests — cần sửa cùng web
- [x] **Huy hiệu** (`app/badges.tsx`, Form; mở từ tab Tôi và khi bấm thông báo `system` `badge_approved|badge_rejected.title`, icon `BadgeCheck` / `BadgeX`): 4 huy hiệu `REQUESTABLE_BADGES` (`useBadgeStates`: đã có từ `profiles.badges` → yêu cầu mới nhất chờ duyệt / bị từ chối + lý do → chưa xin), mỗi thẻ có giấy tờ cần nộp; "Xin huy hiệu" / "Gửi lại" mở khung ngay trong thẻ: `ImagePicker` 1 ảnh (prop mới `cover={false}`, `addLabel`) chọn từ thư viện + "Chụp ảnh" (`takePhoto` — `expo-image-picker` camera, xin quyền khi bấm, bị từ chối → toast gợi ý thư viện) → `prepareVerificationImage` (nén chung với ảnh tin: cạnh dài `VERIFICATION_FILE.longEdgePx` 1600, WebP ≤ 5 MB) → `useRequestBadge` → toast `submitted`; lỗi → `errors.<code>`. Skeleton, lỗi thử lại, khách → đăng nhập, kéo làm mới. `app.json`: bật `cameraPermission` (cần dev build mới)
- [x] **Nút Dịch** ở chi tiết (`useListingTranslation`): chỉ khi `listing.lang` khác ngôn ngữ đang dùng; bấm → `useTranslateListing` → tiêu đề + mô tả đổi sang bản dịch, dòng "Bản dịch tự động" + "Xem bản gốc"; lỗi (`translate_unavailable` — local chưa có API key, `translate_failed`, `rate_limited`) → toast, giữ bản gốc
- [x] **Xoá tài khoản** (tab Tôi, dưới Đăng xuất): `DeleteAccountSheet` — giải thích hậu quả, ô gõ `account.delete_confirm_word` ("XOA", không phân biệt hoa thường), nút đỏ "Xoá vĩnh viễn tài khoản" chỉ bật khi gõ đúng → `useDeleteAccount` → `signOutApp()` (gỡ push token, signOut, xoá cache) → toast `deleted`
- [x] **Coach mark** lần đầu ở Hub (`HubCoachMark` → `src/ui/CoachMark` mới + ui-gallery): BottomSheet 3 bước Tìm → Đăng (+) → Tin nhắn, "Bỏ qua" / "Tiếp" / "Đã hiểu", chấm bước + "1/3"; đổi bước fade `motion.fast` (Reduce Motion 150 ms); xem / bỏ qua / đóng một lần → cờ `coachSeen` (`useSettings`, MMKV), không hiện lại. Không trỏ vào phần tử thật (chữ nêu chỗ bấm)
- [x] **Offline — đã kiểm lại, không đổi code**: nháp tin mới tự lưu `useDraft` (Zustand + MMKV, debounce 500 ms, khoá theo category, mở lại có "Đã mở lại tin bạn đang soạn dở", xoá khi đăng xong / bỏ); tin nhắn lỗi giữ trong cache `useSendMessage` (persist MMKV) với trạng thái `failed` → chạm gửi lại, tin "đang gửi" quá hạn coi như lỗi (`features/chat/hooks.ts`)
- [x] i18n mới (3 ngôn ngữ): `listing.form.photos_min`, `common.home.for_you_feed_hint`, `common.coach.*`, `common.badge_request.{request, request_again, take_photo, from_library, change_photo, photo_label, camera_denied}`; `tsc`, `lint`, `i18n:check` xanh (tsc chỉ còn lỗi trong `packages/core/src/admin.ts` đang được làm song song)
- [ ] Chế độ bản đồ trọ (cluster) — chờ key Goong + `src/ui/MapView` (chưa có thư viện bản đồ)
- [ ] Giấy tờ PDF khi xin huy hiệu — cần thư viện chọn tệp (`expo-document-picker`, chưa duyệt); hiện chỉ ảnh
- [ ] Hàng đợi upload khi mất mạng + flush khi online — cần `@react-native-community/netinfo` (chưa duyệt); hiện ảnh tin lỗi giữ lại để "Tải lại ảnh lỗi"
- [ ] Nhập bằng giọng nói (tìm kiếm, mô tả) — chưa có thư viện / API hệ thống trong stack; Sentry Performance (`hub`, `listing_list`) — chưa cài `@sentry/react-native`; perf pass 200 item / TTI trên máy thật
- [ ] Analytics cho dịch / huy hiệu / xoá tài khoản / coach mark: chưa có tên event trong `events.ts` (thống nhất với web trước)
- [ ] Web cần khớp: nhãn "Đã trả lại" trên `listing-card`, chip khoảng cách ở `/tro`, ≥ 3 ảnh khi đăng trọ
- [ ] Chưa thử trên máy thật (dev build mới vì quyền camera); sheet trên Expo web có thể không mở bằng chạm (5g)

## 5l. Tuần 11 — deep link, hợp đồng "Đã bán", Lottie, rà soát, store (cập nhật 2026-11-05)
Toàn bộ mục dưới chỉ được kiểm bằng `tsc`, `lint`, `i18n:check`, `expo config --type introspect` và đọc mã nguồn thư viện. **Chưa chạy trên máy thật / emulator / Metro**, chưa có dev build mới.

- [x] **Deep link** (`app.json`): `bundleIdentifier` + `package` = `vn.tenapp.app` (id tạm, đã duyệt), `associatedDomains` `applinks:tenapp.vn`, `intentFilters` autoVerify cho `/tin/`, `/nhom/` và thêm `/en/...`, `/zh/...` (bổ sung so với mục 6; config resolve ra đúng entitlement + intent filter). `app/+native-intent.ts` mới: `redirectSystemPath` bỏ tiền tố `/en`, `/zh` của link tin / nhóm để vào `tin/[slug]`, `nhom/[slug]`; ngôn ngữ app vẫn theo cài đặt. Regex đã thử với mẫu URL bằng script (kể cả `hoaphat://` giữ nguyên), chưa chạy trong app
- [x] **"Đã bán"** (hợp đồng 2026-11-03): `ownerActions.markSold` chỉ hiện với `active` / `closed` / `expired`, đúng dòng log backend (trước đây chỉ tin đang đăng). Web `manage.ts` hiện vẫn chỉ `active` → hai bên đang lệch, cần web theo. `forbidden` → toast riêng `manage.sold_forbidden`, thao tác khác `manage.status_forbidden`
- [x] **Mở lại / gửi duyệt lại**: toast theo `status` DB trả về (`pending_review` → "Tin đang chờ duyệt", `rejected` → "Tin chưa được đăng", còn lại → "Đã mở lại tin"). Gửi duyệt lại trước đây luôn báo chờ duyệt kể cả khi bị từ chối lại
- [x] **Lottie**: `assets/lottie/success-check.json` viết tay (vòng tròn + dấu tích, 0,8 giây, màu trung tính, tô `colors.success` qua `colorFilters`), `src/ui/SuccessCheckAnimation.tsx` tải bằng `React.lazy` + `Suspense`, prop `celebrate` của `SuccessScreen` (chỉ đăng mới thành công, không áp dụng khi sửa tin; có trong ui-gallery). Reduce Motion → icon tĩnh. JSON mới chỉ qua kiểm tra cú pháp, **chưa xem hình chạy thật**. `lottie-react-native` là module native → **cần dev client build mới**; không có guard cho bản build cũ, màn thành công sẽ lỗi trên bản cũ
- [x] **Rà soát** (grep + script, cả `app/` và `src/`): chuỗi thô, hex, class tuỳ ý, `Alert.alert`, `duration` số cứng: không có vi phạm (trừ ui-gallery chưa rà chuỗi). Pressable đều có role; nút thiếu label đều có chữ bên trong. Mọi animation Reanimated đã xét Reduce Motion. Đã sửa: link Điều khoản / Bảo mật ở onboarding thêm `accessibilityRole="link"`; `Button` chữ `shrink` (icon + chữ dài tràn ở nút nửa bề ngang); `StatusLine` của `GroupCtaBar` tương tự; hàng giá + badge ở `ThreadHeader` xuống dòng; nhãn `TabBar` thu nhỏ cho vừa thay vì cắt ở 360 px / 150 %. Các lỗi này suy ra từ đọc code, chưa đo trên màn thật
- [x] **Store**: `apps/mobile/store/listing.{vi,en,zh}.md` (tên, phụ đề, mô tả, từ khoá, có gì mới, danh sách ảnh; đã đếm độ dài). Bản en / zh tự dịch, cần người bản ngữ xem. Chưa có ảnh chụp nào
- [ ] **Universal / App Links chưa kiểm chứng được**: cần `.well-known` live trên domain thật, Team ID Apple và SHA-256 Android thật. AASA / `assetlinks.json` phía web phải khai cả `/en/*`, `/zh/*`. Đổi id tạm → build lại và cập nhật `.well-known`
- [x] **Nhấp nháy khi mở lại**: `useSetListingStatus` (`@hp/core`) không còn patch lạc quan `active` (server có thể chuyển thành `pending_review`); sold / closed / draft vẫn lạc quan
- [ ] **Tin đóng còn khoá kiểm duyệt**: không còn trên `public_listings`, bấm từ "Tin của tôi" sẽ ra "Tin không còn" (`MyListing` không có `moderation_hold`). Cần core thêm cột hoặc đổi cách mở
- [ ] Chuỗi xin quyền trong `app.json` (ảnh, máy ảnh) chỉ có tiếng Việt, chưa khai `locales`
- [ ] Checklist mục 12 phần thủ công (Android / iOS, dark, 360 px, 150 %, Reduce Motion, en / zh, deep link từ push): chưa kiểm tra

## 6. Hạ tầng kỹ thuật
- **`app.config.ts`**: `scheme: "hoaphat"`, `ios.bundleIdentifier`, `ios.associatedDomains: ["applinks:tenapp.vn"]`, `android.intentFilters` autoVerify cho `https://tenapp.vn/tin/*` và `/nhom/*`; plugin `expo-notifications`, `expo-localization`, `expo-location` (chỉ foreground), `expo-image`, `@sentry/react-native`.
- **Env** (`.env.example`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOONG_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_IMAGE_TRANSFORM` (mặc định `true`; staging gói Free không có Image Transformation → `false`, tải ảnh gốc). Giá trị thật trong EAS Secrets.
- **EAS**: profile `development` (dev client, Supabase local / staging), `staging` (internal, channel `staging`, Supabase staging), `production` (store, channel `production`). GitHub Actions: PR → tsc / lint / i18n:check / test; merge `main` → `eas update --channel staging`; tag `v*` → `eas build --profile production`.
- **Push**: Expo Push; token ghi `profiles.push_tokens` khi đăng nhập và khi token đổi; xoá khi đăng xuất. Payload `{ screen, params }` → `routeForNotification`.
- **Deep link**: `tenapp.vn/tin/{slug}` → `tin/[slug]` → resolve `short_id` (6 ký tự cuối slug) → `listing/[id]`; `nhom/{slug}` tương tự; `hoaphat://chat/{id}` chỉ cho push.
- **Offline**: TanStack persist MMKV; `src/core/offline` (nháp tin, tin nhắn chưa gửi, hàng đợi upload); flush khi online.
- **Theo dõi**: Sentry (crash + Performance `hub`, `listing_list`); PostHog event: `view_listing`, `contact`, `create_listing`, `join_group`, `search`, `save_listing`, `login_success`, `share_listing`, `home_*` (docs/design/home.md §7).

## 7. Thay đổi hợp đồng với backend (log)
Ghi mỗi khi `@hp/core` / `@hp/shared` / RPC / Edge Function đổi API và mobile phải theo.

| Ngày | Gói / RPC / Function | Thay đổi | Việc ở mobile | Trạng thái |
|---|---|---|---|---|
| 2026-11-03 | `@hp/core` discover-hooks (`useHomeFeed`, `useLostFoundMatches`, `useTranslateListing`, `useMyBadgeRequests`, `useRequestBadge`, `useDeleteAccount`), `searchListings` `maxDistanceM`, `@hp/shared` `LISTING_IMAGES.roomMin`, `REQUESTABLE_BADGES`, `VERIFICATION_FILE`, notification `lost_found_match` + `system` `badge_approved|badge_rejected`, i18n `listing.translate|distance|lost_found.*`, `common.badge_request|account.*`, `errors.{document_missing,badge_owned,already_requested,translate_unavailable,translate_failed}` | Mới: lọc khoảng cách tới khu, khớp đồ thất lạc, gợi ý Hub, dịch tin, huy hiệu, xoá tài khoản | Tuần 9–10 (5k) | xong |
| 2026-11-02 | `@hp/core` venues (`useVenues`, `useContributeVenue`), group-hooks (`useMyGroups`, `useRateGroup`, `useMyGroupRating`), chat-hooks (`useGroupConversationId`, `useConversationMembers`, `ConversationSummary.group_*` / `member_count` / `last_sender_name`), `PublicGroup.venue_*`, `@hp/shared` `ContributeVenueInput`, `CreateGroupInput.venue_id`, `GROUP_RULES.reminderMinutes`, notification `group_completed` / `group_reminder` / `listing_expiring`, i18n `group.venue|mine|rate|chat.*` | Mới: danh mục sân, chat nhóm, Nhóm của tôi, đánh giá chủ nhóm, nhắc giờ | Tuần 8 (5j) | xong |
| 2026-11-02 | `@hp/core` groups + group-hooks + functions (`join-group`, `respond-join`), `@hp/shared` `GROUP_RULES` / `groupDisplayStatus` / `groupViewerRole` / `CreateGroupInput` / `GROUP_ATTRIBUTE_FIELDS` / `RIDE_PLACES`, i18n `group.*` (+ `card.members_count_*`, `form.seats_increase` / `seats_decrease` / `origin_default` / `origin_placeholder` / `starts_at_hint` / `vehicle_note_placeholder` / `title_placeholder_sport` / `draft_restored` / `start_over`) | Mới: nhóm ghép (đọc công khai, tạo, huỷ, tham gia / duyệt / rời optimistic, realtime) | Tuần 7 (5i) | xong |
| 2026-11-01 | `@hp/core` home (`useBanners`, `useMyListingStats`, `useUnreadNotificationCount`, `usePublicStats`), `@hp/shared` `HOME_TILES` / `HOME_SHORTCUTS` / `HOME_RAIL_SIZE` / `givenName`, `@hp/tokens` `aspect.banner` 16:7 | Mới: dữ liệu trang chủ | Hub super app (5f), `listings/[feature]` nhận `shortcut` / `categories` | xong |
| 2026-10-31 | `@hp/core`, `@hp/tokens` | Mới: `SupabaseProvider`, `useSupabase` (React peer); `@hp/tokens/tailwind.preset` (NativeWind) | `AppProviders` bọc `SupabaseProvider`; `tailwind.config.js` dùng preset | xong |
| 2026-10-31 | `@hp/core` listings-write + hooks, `@hp/shared` `CreateListingInput` / `UpdateListingInput` / `MAX_LISTING_IMAGES`, i18n `form.*` / `manage.*` / `saved.*` / `contact.*` / `state.*` / `bookmark.*` | Mới: đăng / sửa (status thật sau kiểm duyệt), upload / xoá ảnh, trạng thái (optimistic), gia hạn, hiện SĐT, tin của tôi, lưu tin; `public_listings` có tin đã bán / đóng / hết hạn (`listingDisplayStatus`) | Form "Đăng nhanh", sửa tin, tin của tôi, tin đã lưu, trái tim + hiện SĐT + banner ở chi tiết | xong |
| 2026-10-31 | `@hp/core` listings + hooks, `@hp/shared` `priceLabel` / `readAttributes` / `featureOfCategory` | Mới: đọc tin công khai (`searchListings` cursor, `getListing(BySlug)`, `similarListings`, `recordListingView`, `logSearch`, `imageUrl(…, transform)`, `avatarUrl`, `shareUrl`) | Hub, danh sách 4 tính năng, chi tiết + `tin/[slug]`; `EXPO_PUBLIC_IMAGE_TRANSFORM` | xong |

## 8. Rủi ro riêng mobile
| Rủi ro | Giảm thiểu |
|---|---|
| Metro không resolve `packages/*` trong workspace | `metro.config.js` có `watchFolders` trỏ gốc repo + `nodeModulesPaths`; EAS build từ gốc monorepo |
| AI sinh màn hình lệch design system | `ui-gallery` làm tham chiếu; `/mobile-done-check` grep hex / import cấm trước mỗi PR |
| Android tầm trung chậm, mạng 4G yếu | FlashList + expo-image + persist MMKV từ tuần 3; đo TTI tuần 10 trước khi thêm animation |
| Font Noto Sans SC tăng dung lượng | tải khi chọn `zh`, không bundle |
| Store từ chối vì nhầm thương hiệu | tên riêng, không logo Hòa Phát, dòng miễn trừ trong app + store listing |
| Deep link không verify | test `.well-known` của web tuần 11 trên thiết bị thật, cả iOS và Android |

## 9. Sau MVP (tháng 4–6)
Ví MoMo / ZaloPay cho pass đồ giá trị cao; mini-app đặt cơm ca, lịch xe đưa đón; thêm khu liên hợp bằng dữ liệu `sites`; live location (`capabilities.liveLocation`) cho ghép xe; Meilisearch khi > 500.000 tin.
