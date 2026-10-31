// @hp/core — hàm gọi Supabase, query keys, capabilities, URL dùng chung app và web.
// Không import React Native, Expo hay Next. Hàm nhận SupabaseClient, trả Result (không throw).
// React chỉ dùng cho SupabaseProvider / useSupabase và hook TanStack Query (peer dependency).
// Luật: .claude/rules/be-shared-packages.md.
export { appOnly, isAppOnly, type AppOnlyFeature } from './capabilities';
export * from './keys';
export * from './result';
export * from './profile';
export * from './social';
export * from './urls';
export { SupabaseProvider, useSupabase } from './provider';
