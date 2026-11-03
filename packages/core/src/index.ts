// @hp/core — hàm gọi Supabase, query keys, capabilities, URL dùng chung app và web.
// Không import React Native, Expo hay Next. Hàm nhận SupabaseClient, trả Result (không throw).
// Entry này KHÔNG import React: dùng được trong Server Component, Server Action, Edge Function.
// Provider + hooks TanStack ở entry riêng `@hp/core/react` (có 'use client').
// Luật: .claude/rules/be-shared-packages.md.
export { appOnly, isAppOnly, type AppOnlyFeature } from './capabilities';
export * from './admin';
export * from './auth';
export * from './badges';
export * from './chat';
export { toAuthError } from './auth-error';
export * from './functions';
export * from './groups';
export * from './keys';
export * from './home';
export * from './listings';
export * from './listings-write';
export * from './moderation';
export * from './notifications';
export * from './result';
export * from './profile';
export * from './reports';
export * from './social';
export * from './urls';
export * from './venues';
