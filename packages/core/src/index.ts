// @hp/core — hàm gọi Supabase, query keys, hooks TanStack Query, capabilities dùng chung app và web.
// Không import React Native, Expo hay Next. Hàm nhận SupabaseClient làm tham số.
// Luật: .claude/rules/be-shared-packages.md · Kế hoạch: docs/plan/backend.md tuần 2–3.
export { appOnly, isAppOnly, type AppOnlyFeature } from './capabilities';
