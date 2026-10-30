---
paths:
  - "apps/mobile/src/features/**"
---

# Feature module

## Quy tắc vàng
- 4 tính năng Listing (`pass`, `room`, `job`, `lost-found`) **chỉ** là `config.ts` cấu hình cho `features/listing`. 2 tính năng Group (`ride`, `sport`) **chỉ** là `config.ts` cho `features/group`.
- Không viết màn hình / hook / form riêng cho 6 feature đó. Khi config không biểu diễn được → mở rộng `features/listing` hoặc `features/group` (types + engine) để mọi feature cùng hưởng.
- Feature không import feature khác. Ngoại lệ: ai cũng được import `listing`, `group`, `profile`; `chat` chỉ được dùng từ `listing` / `group` qua hook `useOpenConversation`.

## Hình dạng config (Listing)
```ts
// src/features/pass/config.ts
import type { ListingFeatureConfig } from '@/features/listing/types';
import { passSchemas } from '@hp/shared';

export const passConfig: ListingFeatureConfig = {
  key: 'pass',
  categories: ['pass_electronics', 'pass_vehicle', 'pass_ppe', 'pass_home'],
  color: 'pass',                                   // t.serviceColors.pass
  filters: ['subcategory', 'price', 'condition', 'radius', 'site', 'sort'],
  form: {
    required: ['images', 'title', 'price'],        // "Đăng nhanh" 3 bước
    fieldsByCategory: {
      pass_vehicle: ['vehicle_type', 'brand', 'year', 'odometer_km', 'plate_prefix'],
      pass_electronics: ['brand', 'model', 'condition', 'warranty_months'],
      pass_ppe: ['item_type', 'size', 'condition'],
      pass_home: ['condition'],
    },
    schema: passSchemas,                           // Zod từ @hp/shared, không khai báo lại
    minImages: 1, maxImages: 10,
  },
  card: { variant: 'grid', estimatedHeight: 260, showDistance: true },
  detail: { ctas: ['chat', 'call'], map: 'optional', rateAfter: true },
  listing: { expiresDays: 30, review: 'rule' },
  i18nNs: 'listing',
};
```
`GroupFeatureConfig` tương tự: `kind`, `subKinds`, `form`, `card`, `detail.ctas: ['join']`, `map: 'required'`, `reminderMinutes: 60`.

## Dữ liệu
- `features/*/hooks.ts` chỉ **gọi lại** hook/hàm của `@hp/core` và thêm phần riêng mobile (GPS, MMKV, haptic, toast). Không `supabase.from(...)` ở đây; thiếu hàm → thêm vào `packages/core`.
- Query key chỉ từ `keys` của `@hp/core/keys`. Mutation `invalidateQueries` đúng key.
- Optimistic + rollback bắt buộc cho: gửi tin nhắn, lưu tin, tham gia nhóm, đánh dấu đã bán. Dùng skill `/optimistic-mutation`.
- Thao tác nhiều bước (`join-group`, `respond-join`, `request-badge`, `translate-content`) gọi wrapper trong `@hp/core/functions` (bên trong là `functions.invoke`), không ghép nhiều query ở client.
- Quyền: client chỉ ẩn/hiện; không `if (profile.role === 'admin')` để quyết định dữ liệu. Lỗi từ server map sang `t('errors.' + code)`.

## Form (màn kiểu Form)
- React Hook Form + `zodResolver(schema từ @hp/shared)`. Lỗi hiện inline dưới ô nhập.
- Tự lưu nháp: `useDraft(key)` (Zustand + MMKV) debounce 500ms; xoá nháp khi submit thành công.
- Ảnh: `ImagePicker` → `useImageUpload` (`@/core/upload`); submit chỉ gửi path đã upload.
- Vị trí mặc định: `profile.site` → `sites.location`; `LocationPicker` xin quyền GPS khi người dùng bấm "vị trí hiện tại".
- Thành công: màn chúc mừng + Lottie confetti ngắn + nút "Xem tin" (`SuccessScreen` của `@/ui`).

## Components trong feature
`features/listing/components`, `features/group/components`, `features/chat/components` ghép từ `@/ui`; không tạo component giao diện generic ở đây (đưa vào `src/ui`). Attribute đặc thù (vd `DistanceToSite` cho trọ) đăng ký vào `attributeRenderers` của engine listing.
