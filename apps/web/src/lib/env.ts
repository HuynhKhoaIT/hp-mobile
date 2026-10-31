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
} as const;
