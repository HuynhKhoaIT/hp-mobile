---
paths:
  - "apps/mobile/src/ui/**"
  - "apps/mobile/app/**"
  - "apps/mobile/src/features/**"
---

# Design system và giao diện

Nguồn duy nhất của component giao diện là `src/ui` (`@/ui`). Token: `@hp/tokens` qua preset NativeWind (className) và `useTheme()` (giá trị cho Reanimated / thư viện không nhận className).

## Cấm (ESLint `no-restricted-imports` + review)
| Cấm | Dùng thay |
|---|---|
| `Text`, `Image`, `FlatList`, `SectionList`, `Animated` của `react-native` | `@/ui/Text`, `expo-image`, `FlashList`, Reanimated / Moti |
| `StyleSheet.create` chứa hex hoặc px | className NativeWind; giá trị động qua `useTheme()` |
| `bg-[#0B4F9C]`, `p-[13px]`, `text-[15px]` (class tuỳ ý) | `bg-primary`, `p-3` / `p-4`, `text-md` |
| `<View style={{ padding: 16, backgroundColor: '#fff' }}>` | `<Card>`, `<Row gap={2}>`, `<Col>`, `<Spacer>` |
| icon từ bộ khác Lucide | `lucide-react-native` size 20 (nút) / 24 (tab), `strokeWidth={1.75}` |
| `Alert.alert` cho xác nhận | `BottomSheet` xác nhận có nút ghi rõ việc ("Xoá tin") |

## Khi cần component mới
1. Kiểm tra danh sách có sẵn ở `apps/mobile/CLAUDE.md` mục 5. Có rồi → thêm prop/variant, không tạo trùng.
2. Tạo `src/ui/<Name>.tsx`: props typed, variant kiểu `cva`, `accessibilityRole` / `accessibilityLabel`, dark mode tự theo token (component không biết đang ở theme nào).
3. Export từ `src/ui/index.ts`.
4. Thêm mục vào `app/(dev)/ui-gallery.tsx` hiển thị mọi variant + trạng thái (disabled, loading, error).
5. Thử: 360px, font scale 150%, dark, Reduce Motion.
Dùng skill `/new-ui-component`.

## Motion (Reanimated / Moti, chạy trên UI thread)
- Thời lượng/easing chỉ từ `t.motion.instant | fast | base | slow`; không tự ghi `duration: 300`.
- Mọi animation đọc `useReducedMotion()` từ `@/ui/theme` → khi bật, chỉ fade 150ms.
- Nút: scale 0.97 khi nhấn đã có sẵn trong `Button` / `IconButton` / `Card onPress`; không tự làm lại ở feature.
- Haptic (`expo-haptics` Light) chỉ ở: đăng tin thành công, tham gia nhóm, lưu tin.
- Danh sách tải xong: `<StaggerItem index>` của `@/ui` (fade + translateY 8, 30ms, tối đa 8 item đầu).
- Lưu tin: `BookmarkButton` của `@/ui` (tim nảy 1 → 1.3 → 1).
- Animation không bao giờ chặn thao tác; không animation trong khi đang nhập liệu.

## Dễ dùng
- Vùng chạm ≥ 48 (nút chính), ≥ 44 (phụ, dùng `hitSlop`). Nút chỉ có icon bắt buộc `accessibilityLabel` (qua `t()`).
- Chữ thân `text-md` (16) trở lên; nhãn `text-sm` (14) là nhỏ nhất; giá tiền weight 700.
- Không cắt chữ trong nút (`numberOfLines` chỉ cho card). Chừa 30% chiều dài cho tiếng Anh.
- Trạng thái không truyền tải chỉ bằng màu: `Badge` luôn có chữ.
- Icon ở Hub và TabBar luôn kèm chữ.
- Hỗ trợ font scale hệ thống 150%: vùng chứa chữ nhiều dòng dùng `minHeight`, không `height` cố định.

## Nhất quán với web
`ListingCard`, `GroupCard`, `Badge`, màu trạng thái phải khớp bản web (`apps/web/src/features/listing/components/listing-card.tsx`, `group-card.tsx`): cùng thứ tự thông tin, cùng tone badge, cùng tên prop. Đổi một bên → ghi chú trong PR để đổi bên kia.
