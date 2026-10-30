---
paths:
  - "apps/mobile/app/**"
  - "apps/mobile/src/**"
---

# Hiệu năng và mạng yếu

- Danh sách: `FlashList` + `estimatedItemSize` từ config; `onEndReachedThreshold` sao cho prefetch khi còn 5 item; `keyExtractor` theo `id`; không `ScrollView` chứa list.
- Ảnh: `expo-image` với `placeholder={blurhash}`, `cachePolicy="memory-disk"`, `contentFit="cover"`, `transition={t.motion.fast.duration}`; nền `bg-surface-2`. URL qua `imageUrl(path, 'thumb' | 'full')` của `@hp/core` (`?width=400&quality=75` / `?width=1280`). Card 4:3, avatar 1:1.
- Query: list `staleTime` 60s, detail 30s, persist MMKV; `refetchOnWindowFocus: false` trừ chat và thông báo. Không `useEffect` fetch thủ công; không `setState` sao chép dữ liệu query.
- Bản đồ / Lottie / sheet nặng: mount khi mở; việc nặng sau điều hướng chạy trong `InteractionManager.runAfterInteractions`.
- Realtime: 1 kênh / màn hình, unsubscribe khi unmount; tối đa 5 kênh.
- Khởi động: font preload, splash giữ đến khi session khôi phục, màn Hub đọc cache MMKV trước khi refetch.
- Đo: Sentry Performance cho Hub và List; mục tiêu TTI p75 < 1.5s, cold start < 2s, app < 40 MB.
- Trước khi merge một màn List: thử với 200 item seed trên Android tầm trung, cuộn nhanh không rớt khung, không warning "VirtualizedList".
