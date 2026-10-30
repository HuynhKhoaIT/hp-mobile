---
paths:
  - "apps/mobile/src/core/**"
---

# `src/core` — hạ tầng app

| Thư mục | Nội dung | Luật |
|---|---|---|
| `supabase.ts` | `createClient<Database>` với `storage` MMKV, `autoRefreshToken: true`, `detectSessionInUrl: false` | nơi **duy nhất** tạo client; truyền vào hàm `@hp/core` qua `SupabaseProvider` |
| `auth/` | `useSession`, `useProfile`, `requireAuth(action)`, `signOut()` (xoá push token trước khi đăng xuất) | `returnTo` + `pendingAction` lưu Zustand, không trong URL |
| `query/` | `queryClient` (list staleTime 60s, gcTime 24h), persister MMKV, re-export `keys` từ `@hp/core/keys` | không khai báo key mới ở đây |
| `notifications/` | đăng ký token → `profiles.push_tokens`; `routeForNotification(data)` map `screen` → route; badge count | thêm loại thông báo mới = thêm 1 dòng map + 1 test |
| `location/` | xin quyền khi cần, cache 5 phút, fallback `sites.location` của khu người dùng | không theo dõi nền |
| `upload/` | nén `expo-image-manipulator` cạnh dài 1280, WebP q0.8 → `{user_id}/{listing_id}/{n}.webp`; hàng đợi retry lũy thừa (1s, 2s, 4s, 8s, 16s, tối đa 5) | > 2MB sau nén → nén lại q0.6 |
| `offline/` | Zustand + MMKV: bản nháp tin, tin nhắn chưa gửi, hàng đợi upload; flush khi `NetInfo` online | — |
| `i18n/` | init i18next với resources từ `@hp/shared/i18n`, `setLocale()` cập nhật i18next + `profiles.locale` + tải Noto Sans SC khi `zh` | — |
| `analytics/` | PostHog wrapper `track(event, props)`, `identify`, `screen()`; `events.ts` liệt kê tên event | tên `snake_case`; props không chứa SĐT / tên đầy đủ |
| `sentry.ts` | init, `setUser({ id })`, Performance transaction `hub`, `listing_list` | không gửi PII |

## Luật
1. `src/core` không import từ `src/features` hay `app/`.
2. Biến môi trường chỉ: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOONG_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_WEB_URL`. Không bao giờ service role key. Thêm biến → cập nhật `.env.example`.
3. Deep link: `app.config.ts` khai `scheme: 'hoaphat'`, `ios.associatedDomains: ['applinks:tenapp.vn']`, `android.intentFilters` autoVerify cho `tenapp.vn/tin/*` và `/nhom/*`. Đổi ở đây → cập nhật `docs/plan/mobile.md` mục 6 và sửa `.well-known` ở `apps/web`.
4. Push payload chuẩn từ `send-push`: `{ screen: 'listing' | 'group' | 'chat' | 'notifications', params: { id } }`. Không xử lý payload khác dạng này; thiếu `screen` → mở tab Thông báo.
5. Realtime: tối đa 5 kênh đồng thời; helper `useRealtimeChannel(name, handlers)` tự unsubscribe khi unmount.
