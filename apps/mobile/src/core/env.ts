// Biến môi trường công khai. Expo chỉ thay EXPO_PUBLIC_* khi viết đầy đủ `process.env.EXPO_PUBLIC_X` (không destructure).
// Local: .env.local; staging / production: EAS Environment Variables. Không bao giờ có service role key.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Thiếu ${name} — xem apps/mobile/.env.example`);
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://tenapp.vn',
  goongKey: process.env.EXPO_PUBLIC_GOONG_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
} as const;
