@AGENTS.md

# CLAUDE.md — Mobile app (Expo / React Native)

> Đặt file này tại `apps/mobile/CLAUDE.md`. Tài liệu kiến trúc đầy đủ: `docs/ARCHITECTURE.md` (mục 2, 4, 7, 8, 9). Web chạy song song: `apps/web/CLAUDE.md`. Backend: `supabase/CLAUDE.md`. Khi có mâu thuẫn, file này thắng cho phần mobile.
>
> App này build **iOS và Android**. Web người dùng là Next.js riêng (`apps/web`), **không** build app này ra web. Hai bên dùng chung `@hp/core`, `@hp/shared`, `@hp/db`, `@hp/tokens`.

## 1. Sản phẩm

Super app cộng đồng cho người lao động quanh các khu liên hợp Hòa Phát. Đây là app cá nhân, **không** phải app chính thức của Tập đoàn Hòa Phát; không dùng logo Hòa Phát, và trang Giới thiệu ghi rõ "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát".

| Tính năng | Mẫu dữ liệu | Category / kind |
|---|---|---|
| Pass đồ (điện tử, xe, đồ bảo hộ, gia dụng) | Listing | `pass_electronics`, `pass_vehicle`, `pass_ppe`, `pass_home` |
| Tìm trọ | Listing | `room_rent`, `room_share` |
| Tìm việc (chính, làm thêm ngoài ca) | Listing | `job_main`, `job_parttime` |
| Đồ thất lạc | Listing | `lost`, `found` |
| Ghép xe về thành phố | Group | `kind = ride` |
| Ghép trận / tìm sân (bóng đá, cầu lông, pickleball) | Group | `kind = sport` |

**Quy tắc vàng:** 4 tính năng Listing dùng chung `features/listing`, 2 tính năng Group dùng chung `features/group`. Không viết lại logic cho từng tính năng; chỉ cấu hình danh mục con, filter, field form và card variant trong `features/<tên>/config.ts`.

Người dùng: 18–55 tuổi, nhiều người không rành công nghệ, Android tầm trung, mạng 4G yếu trong nhà máy, dùng một tay. Ngôn ngữ: **vi (mặc định), en, zh**.

## 2. Stack (không tự ý thêm thư viện ngoài danh sách)

- Expo SDK mới nhất, TypeScript strict, Expo Router (file-based)
- UI: Reanimated 3, Moti, Gesture Handler, `@shopify/flash-list`, `expo-image`, `@gorhom/bottom-sheet`, `lucide-react-native`, `lottie-react-native`, `expo-haptics`
- Styling: NativeWind (Tailwind cho React Native) với preset từ `@hp/tokens` — cùng tên class với web để AI chuyển màn hình qua lại dễ
- Data: `@supabase/supabase-js`, `@hp/core` (hàm gọi Supabase, query keys, hooks TanStack Query dùng chung với web), TanStack Query v5 (persist qua MMKV), Zustand
- Form: React Hook Form + Zod (schema import từ `@hp/shared`)
- i18n: `i18next`, `react-i18next`, `expo-localization`
- Bản đồ: Goong Maps (chỉ qua wrapper `src/ui/MapView`)
- Khác: `expo-notifications`, `expo-image-manipulator`, `expo-location`, `react-native-mmkv`, Sentry, PostHog

Muốn thêm thư viện mới → hỏi trước, nêu lý do và dung lượng tăng thêm.

## 3. Cấu trúc thư mục

```
app/                          # CHỈ routes, mỗi file là 1 màn hình
├── _layout.tsx               # Providers: Query, Auth, Theme, i18n, Toast, BottomSheet
├── (auth)/phone.tsx | otp.tsx | onboarding.tsx
├── (tabs)/_layout.tsx        # 5 tab: Trang chủ, Khám phá, Đăng(+), Tin nhắn, Tôi
├── (tabs)/index.tsx | explore.tsx | post.tsx | chat/index.tsx | me.tsx
├── listing/[id].tsx          # chi tiết tin (mọi category)
├── listing/new/[category].tsx
├── group/[id].tsx
├── group/new/[kind].tsx
├── chat/[conversationId].tsx
├── search.tsx
└── (dev)/ui-gallery.tsx      # trưng bày toàn bộ component + variant

src/
├── core/                     # supabase client (MMKV storage), auth, notifications, location, upload (nén ảnh), analytics
├── features/
│   ├── listing/              # components/ + hooks riêng mobile (nếu có); dữ liệu lấy từ @hp/core
│   ├── pass/ room/ job/ lost-found/    # config.ts (+ component riêng nếu thật cần)
│   ├── group/                # components/
│   ├── ride/ sport/          # config.ts
│   ├── chat/
│   └── profile/
├── ui/                       # design system — nguồn duy nhất cho component giao diện
└── lib/                      # format.ts (tiền, ngày, khoảng cách), utils
```

## 4. Luật kiến trúc (bắt buộc)

1. File trong `app/` chỉ ghép component và gọi hook. **Không** import `supabase` trong `app/`.
2. Mọi gọi server và mọi `useQuery` / `useMutation` dùng chung nằm trong **`@hp/core`** (`packages/core`), không viết lại trong app. Thiếu thì thêm vào `@hp/core` — code ở đó không được import React Native, Expo hay Next; hàm nhận `SupabaseClient` làm tham số. Hook chỉ riêng mobile (vd. kết hợp vị trí GPS) đặt trong `features/*/hooks.ts` và gọi lại `@hp/core`.
3. Query key chỉ lấy từ `@hp/core/keys`: `keys.listings(filters)`, `keys.listing(id)`, `keys.groups(kind, filters)`, `keys.group(id)`, `keys.conversations()`, `keys.messages(conversationId)`, `keys.profile(id)`, `keys.notifications()`.
4. Mutation phải `invalidateQueries` đúng key. Dùng optimistic update cho: gửi tin nhắn, lưu tin, tham gia nhóm, đánh dấu đã bán; rollback khi lỗi.
5. Feature không import từ feature khác (trừ `listing` và `group` là module dùng chung).
6. Type DB lấy từ `@hp/db` (`Database['public']['Tables'][...]`), không khai báo lại.
7. Không đặt logic quyền ở client: server (RLS) quyết định, client chỉ ẩn/hiện UI.
8. Thao tác nhiều bước (tham gia nhóm, duyệt thành viên, gửi giấy tờ xác minh, dịch tin) gọi Edge Function qua `supabase.functions.invoke`, không tự ghép nhiều query.
9. Link chia sẻ luôn là **URL web**: `https://tenapp.vn/tin/{slug}`, `https://tenapp.vn/nhom/{slug}` (slug = tiêu đề không dấu + id ngắn). Cấu hình Universal Links (iOS) và App Links (Android) cho `tenapp.vn` để máy đã cài app thì mở thẳng app; chưa cài thì mở trang web. Expo Router map `tin/[slug]` → màn hình chi tiết tin, `nhom/[slug]` → chi tiết nhóm. Scheme nội bộ `hoaphat://chat/{id}` chỉ dùng cho push. Push dùng `data.screen` + `data.params`.
10. Khách chưa đăng nhập được xem và tìm tin; bấm Liên hệ / Đăng / Tham gia thì mở luồng đăng nhập rồi quay lại đúng chỗ. Cùng tài khoản dùng được trên web và app.
11. Tính năng chỉ có trên app khai báo trong `@hp/core/capabilities.ts` (`push`, `reminders`, `lostFoundInstantMatch`, `liveLocation`, `offlineDrafts`). Thêm tính năng app-only mới → khai báo ở đó để web hiện thẻ mời tải app. Mọi tính năng khác phải có bản tương ứng trên web; một tính năng chỉ "xong" khi web cũng chạy được.

## 5. Design system (`src/ui`)

**Chỉ dùng component trong `@/ui`. Không hard-code màu, số pixel, font.** Component trong `src/ui` viết bằng NativeWind `className` dùng class sinh từ preset `@hp/tokens` (vd. `bg-primary`, `text-muted`, `p-4`, `rounded-md`) — cùng tên class với web. Giá trị cần cho animation hoặc thư viện không nhận className lấy qua `useTheme()` → `t.colors`, `t.space`, `t.radius`, `t.font`, `t.motion` (cũng đọc từ `@hp/tokens`). Không khai báo token lần thứ hai trong app.

Token:
- Màu: `primary #0B4F9C` (xanh thép chủ đạo), `primaryLight #E6EFFA`, `accent #F2762E` (nút Đăng), `success #1E9E5A`, `warning #E0A100`, `danger #D93025`, `bg #F6F7F9`, `surface #FFFFFF`, `surface2 #EEF0F3`, `border #E2E5EA`, `text #111827`, `textMuted #6B7280`, `textDisabled #9CA3AF`. Bộ dark cùng tên token: `bg #0F1115`, `surface #171A20`, `surface2 #1F232B`, `border #2A2F38`, `text #F3F4F6`, `primary #5B9BE6`.
- Header trang chủ: gradient `#0B4F9C → #1E6FD9`.
- Màu dịch vụ (`t.serviceColors`): pass cam, room tím, job xanh lá, ride xanh ngọc, sport đỏ, lostFound vàng.
- Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32. Padding màn hình 16, khoảng cách card 12.
- Radius: sm 6 (input), md 10 (card), lg 14 (sheet), xl 20, full 999 (chip).
- Font: Be Vietnam Pro (vi/en), Noto Sans SC (zh, tải khi chọn tiếng Trung). Size 12/14/16/18/20/24/28. Chữ thân tối thiểu **16**. Weight 400 thân, 500 nhãn, 600 tiêu đề, 700 giá tiền.
- Shadow: chỉ card và FAB (`0 1 3 rgba(0,0,0,0.06)`).
- Icon: Lucide, 20 trong nút, 24 trong tab, stroke 1.75. Không trộn bộ icon khác.
- Vùng chạm: 48×48 cho nút chính, 44×44 cho phụ (dùng hitSlop).

Component có sẵn (thiếu thì **tạo trong `src/ui` + thêm vào `ui-gallery`**, không tạo tại chỗ trong feature):
`Text, Button, IconButton, Input, Select, MultiSelect, PriceInput, ImagePicker, LocationPicker, DateTimePicker, Chip, Badge, Avatar, Card, ListingCard, GroupCard, ServiceTile, SectionHeader, BottomSheet, Toast, Skeleton, SkeletonListingCard, EmptyState, ErrorState, Screen, Header, TabBar, SearchBar, FilterBar, MapView, MessageBubble, Rating, Divider, Spacer, Row, Col`.

Cấm: `Text`/`Image`/`FlatList`/`Animated` gốc của react-native (dùng `@/ui/Text`, `expo-image`, `FlashList`, Reanimated/Moti); `StyleSheet` có mã hex; class Tailwind giá trị tuỳ ý kiểu `bg-[#123456]` hay `p-[13px]`; `View` có style màu/khoảng cách thủ công khi đã có `Row/Col/Card`.

Card tin, badge, trạng thái phải nhìn giống bản web (`apps/web`) để người dùng chuyển qua lại không bỡ ngỡ.

## 6. Mẫu màn hình — mọi màn hình thuộc 1 trong 5 kiểu

Ghi ở dòng đầu file: `// Screen type: List | Detail | Form | Conversation | Hub`

| Kiểu | Khung |
|---|---|
| List | `Screen` → `SearchBar` + `FilterBar` → `FlashList` (`ListingCard`/`GroupCard`) → Skeleton / EmptyState / ErrorState → FAB Đăng; pull-to-refresh; infinite scroll theo cursor |
| Detail | carousel ảnh → tiêu đề, giá, badge → thông tin theo `attributes` → người đăng (Avatar + Rating + huy hiệu) → mô tả (+ nút Dịch) → tin tương tự → thanh CTA dính đáy (Chat / Gọi / Tham gia) |
| Form | `ImagePicker` → thông tin chính → chi tiết → vị trí → nút submit dính đáy; keyboard-aware; tự lưu bản nháp |
| Conversation | Header có ngữ cảnh tin/nhóm → danh sách `MessageBubble` đảo ngược → ô nhập + nút ảnh |
| Hub | header xanh cong + ô tìm kiếm → lưới 6 `ServiceTile` → banner trượt → section ngang ("Gần bạn", "Mới đăng", "Kèo hôm nay") |

Mỗi màn hình **bắt buộc** có 3 trạng thái: loading (skeleton đúng hình dạng nội dung, không spinner giữa màn), empty (illustration + CTA), error (nút thử lại). Mỗi màn hình tối đa 1 hành động chính.

## 7. Motion

Token `t.motion`: `instant 100ms ease-out`, `fast 200ms ease-out`, `base 280ms spring(damping 18, stiffness 180)`, `slow 400ms ease-in-out`.

- Nút: scale 0.97 khi nhấn; haptic nhẹ cho đăng tin, tham gia nhóm, lưu tin.
- Card → chi tiết: shared element ảnh.
- Danh sách tải xong: item hiện lần lượt (fade + translateY 8, stagger 30ms, tối đa 8 item đầu).
- Lưu tin: tim nảy 1 → 1.3 → 1.
- Đăng tin thành công: màn hình chúc mừng + Lottie confetti ngắn.
- Tham gia nhóm: avatar bay vào hàng avatar nhóm, số chỗ đếm ngược.
- Header trang chủ thu gọn khi cuộn, ô tìm kiếm dính trên cùng.
- Tab active: icon nảy nhẹ; nút Đăng xoay 45° khi mở menu.
- Skeleton shimmer 1.2s/lượt.
- Luôn kiểm tra `AccessibilityInfo.isReduceMotionEnabled()` → thay bằng fade 150ms. Animation không bao giờ chặn thao tác.

## 8. Đa ngôn ngữ (vi / en / zh)

- Không viết chuỗi hiển thị trong component. Mọi chữ: `t('namespace.key')`.
- File dịch: `packages/shared/i18n/{vi,en,zh}/{common,listing,group,chat,auth,errors}.json`. Thêm key → thêm **cả 3 file** trong cùng commit; `pnpm i18n:check` phải pass.
- Ngôn ngữ chọn ở bước đầu onboarding (mặc định theo máy qua `expo-localization`), đổi được trong Cài đặt, lưu `profiles.locale`.
- Danh mục/enum: DB lưu mã, app dịch qua `category.<code>`, `status.<code>`.
- Tiền/số/ngày/thời gian tương đối chỉ qua `src/lib/format.ts` (dùng `Intl` theo locale). Tiền luôn VND.
- Chừa 30% chiều dài cho tiếng Anh; không cắt chữ trong nút; kiểm tra căn chỉnh tiếng Trung.
- Nội dung người dùng giữ ngôn ngữ gốc; nếu `listing.lang !== locale` hiện nút "Dịch" → gọi Edge Function `translate-content`.

## 9. Hiệu năng & mạng yếu

- `FlashList` có `estimatedItemSize`; prefetch trang tiếp khi còn 5 item.
- `expo-image` có placeholder blurhash, `cachePolicy="memory-disk"`; thumbnail qua Storage transform `?width=400&quality=75`, chi tiết `?width=1280`.
- Ảnh upload: nén cạnh dài 1280px, WebP, quality 0.8 trước khi upload; hàng đợi retry lũy thừa.
- TanStack Query `staleTime` 60s cho danh sách, persist cache MMKV để mở app có dữ liệu ngay.
- Bản đồ chỉ mount khi người dùng mở chế độ bản đồ; lazy-require màn hình nặng.
- Bản nháp tin đăng và tin nhắn chưa gửi persist bằng Zustand + MMKV.
- Realtime: subscribe kênh `conversation:{id}` khi vào màn hình, unsubscribe khi rời.
- Mục tiêu: cold start < 2s, TTI màn hình chính p75 < 1.5s trên Android tầm trung, crash < 0.5% phiên.

## 10. Dễ dùng mọi lứa tuổi

- Icon ở trang chủ và tab bar luôn kèm chữ.
- Hỗ trợ cỡ chữ hệ thống đến 150% không vỡ layout.
- `accessibilityLabel` cho mọi nút chỉ có icon; tương phản tối thiểu 4.5:1; không truyền tải thông tin chỉ bằng màu.
- Ngôn ngữ đời thường ("Pass đồ", "Ghép xe về quê"), không thuật ngữ.
- Đăng tin pass đồ chỉ bắt buộc ảnh + tiêu đề + giá; có "Đăng nhanh" 3 bước.
- Tìm kiếm và mô tả hỗ trợ nhập bằng giọng nói của hệ thống.
- Hành động khó hoàn tác xác nhận bằng BottomSheet có nút ghi rõ ("Xoá tin", không phải "OK").
- Coach mark lần đầu cho 3 thao tác: tìm, đăng, nhắn; bỏ qua được.
- Hiện hướng dẫn giao dịch an toàn trước khi mở chat lần đầu; nút Báo cáo và Chặn ở mọi hồ sơ, tin, chat.

## 11. Quy ước code

- TypeScript strict, không `any`, không `@ts-ignore`.
- Component `PascalCase.tsx`, hook `useXxx.ts`, config `config.ts`.
- Import alias: `@/ui`, `@/core`, `@/features`, `@/lib`, `@hp/core`, `@hp/shared`, `@hp/db`, `@hp/tokens`.
- Commit: Conventional Commits — `feat(pass): form đăng xe`, `fix(chat): trùng tin nhắn`.
- Không commit secret; biến `EXPO_PUBLIC_*` khai báo trong `.env.example`. Không bao giờ có service role key trong app.
- Không sửa file ngoài phạm vi được yêu cầu.

## 12. Trước khi báo "xong"

- [ ] Chạy trên Android và iOS, không warning đỏ
- [ ] Đủ loading / empty / error
- [ ] Light + dark, màn hình 360px, font scale 150%, bật Reduce Motion
- [ ] Cả 3 ngôn ngữ hiển thị đúng, `i18n:check` pass
- [ ] Không màu/hex/pixel hard-code; không import `supabase` trong `app/`
- [ ] Deep link từ push mở đúng màn hình
- [ ] Đã gắn event analytics chính (`view_listing`, `contact`, `create_listing`, `join_group`)
- [ ] Component mới đã có trong `ui-gallery`
- [ ] Logic dữ liệu nằm trong `@hp/core`, không viết lại trong app; web vẫn build được (`pnpm --filter web build`)
- [ ] Link chia sẻ là URL `tenapp.vn`, mở đúng màn hình khi app đã cài
- [ ] Tính năng mới đã có bản web, hoặc đã khai báo trong `capabilities.appOnly`
