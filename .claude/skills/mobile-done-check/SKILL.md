---
name: mobile-done-check
description: Kiểm tra checklist "trước khi báo xong" của CLAUDE.md mục 12 cho các file vừa thay đổi; chạy tsc, lint, i18n:check và rà rule vi phạm bằng grep. Dùng trước khi kết thúc một tính năng hoặc mở PR.
---

# Kiểm tra trước khi báo "xong"

## 1. Tự động
```
pnpm tsc --noEmit
pnpm lint
pnpm i18n:check
pnpm test        # nếu có
```
Rà trên `git diff --name-only` (và file mới):
- `app/` có `from '@supabase` hoặc `@/core/supabase` → vi phạm.
- Hex `#[0-9A-Fa-f]{3,6}` hoặc class tuỳ ý `-\[` trong `app/`, `src/` (trừ `src/ui/theme`) → vi phạm.
- `from 'react-native'` có `Text | Image | FlatList | Animated | SectionList` → vi phạm.
- Chuỗi có dấu tiếng Việt trong JSX / props ngoài `ui-gallery` và test → vi phạm i18n.
- File route thiếu `// Screen type:`.
- `useQuery(` / `useMutation(` / `useInfiniteQuery(` trong `app/` → vi phạm.
- `track(` dùng tên không có trong `src/core/analytics/events.ts`.
- `duration:` số cứng trong animation thay vì `t.motion`.
- `Alert.alert(` → thay bằng BottomSheet.

## 2. Thủ công (ghi kết quả từng mục)
- [ ] Android + iOS chạy, không warning đỏ
- [ ] Loading skeleton / empty có CTA / error có thử lại
- [ ] Light + dark; 360px; font 150%; Reduce Motion
- [ ] vi / en / zh không tràn, không cắt chữ
- [ ] Deep link từ push mở đúng màn (nếu có màn mới)
- [ ] Mutation có optimistic + rollback (nếu thuộc 4 trường hợp)
- [ ] Component mới đã có trong `ui-gallery`
- [ ] Hàm dữ liệu mới nằm ở `@hp/core`; web vẫn build: `pnpm --filter web tsc --noEmit`
- [ ] Tính năng mới có bản web, hoặc đã thêm vào `capabilities.appOnly` (trong `packages/core/src/capabilities.ts`)
- [ ] Link chia sẻ là `https://tenapp.vn/...`
- [ ] Event analytics chính đã gắn

## 3. Báo cáo
Liệt kê mục chưa đạt kèm `file:dòng`. Bước không chạy được (vd không có thiết bị) ghi rõ "chưa kiểm tra", không đánh dấu đạt.
