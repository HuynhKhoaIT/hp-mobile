'use client';

// @hp/core/react — phần cần React: SupabaseProvider / useSupabase và hook TanStack Query.
// Chỉ import trong client (app, Client Component của web). Server dùng hàm thuần từ `@hp/core`.
export { SupabaseProvider, useSupabase } from './provider';
export {
  type SessionState,
  unwrap,
  useCompleteOnboarding,
  useMyProfile,
  useSession,
  useSites,
  useUpdateProfile,
} from './hooks';
