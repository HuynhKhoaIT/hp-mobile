// Biến môi trường công khai (NEXT_PUBLIC_*) — Next thay giá trị lúc build khi viết đầy đủ `process.env.NEXT_PUBLIC_X`.
// Biến bí mật (service role) chỉ đọc trong src/lib/supabase/admin.ts.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Thiếu ${name} — xem apps/web/.env.example`);
  return value;
}

export const publicEnv = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /** Supabase Image Transformation có bật không (staging gói Free: false → imageUrl trả ảnh gốc). Mặc định true. */
  imageTransform: process.env.NEXT_PUBLIC_IMAGE_TRANSFORM !== 'false',
  /** Cho Google lập chỉ mục: chỉ `true` trên production (preview / staging giữ noindex). */
  allowIndex: process.env.NEXT_PUBLIC_ALLOW_INDEX === 'true',
  /** Người vận hành + email ở trang pháp lý. Trống → trang ghi "đang cập nhật"; bắt buộc điền trước khi lên store. */
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL ?? '',
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '',
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
} as const;
