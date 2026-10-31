// @hp/core — hàm gọi Supabase, query keys, capabilities, URL dùng chung app và web.
// Không import React Native, Expo hay Next. Hàm nhận SupabaseClient, trả Result (không throw).
// Entry này KHÔNG import React: dùng được trong Server Component, Server Action, Edge Function.
// Provider + hooks TanStack ở entry riêng `@hp/core/react` (có 'use client').
// Luật: .claude/rules/be-shared-packages.md.
export { appOnly, isAppOnly, type AppOnlyFeature } from './capabilities';
export * from './auth';
export { toAuthError } from './auth-error';
export * from './keys';
export * from './listings';
export * from './result';
export * from './profile';
export * from './social';
export * from './urls';
