// @hp/core — hàm gọi Supabase, query keys, capabilities, URL dùng chung app và web.
// Không import React Native, Expo hay Next. Hàm nhận SupabaseClient, trả Result (không throw).
// Hooks TanStack Query thêm khi app / web dựng QueryClient + SupabaseProvider (docs/plan tuần 2–3).
// Luật: .claude/rules/be-shared-packages.md.
export { appOnly, isAppOnly, type AppOnlyFeature } from './capabilities';
export * from './keys';
export * from './result';
export * from './profile';
export * from './social';
export * from './urls';
