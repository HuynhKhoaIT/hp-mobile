// Đăng nhập dùng chung app và web: OTP qua SMS (Supabase Auth phone), Google OAuth, đăng xuất.
// Nhận client của từng nơi (app: MMKV storage; web: cookie qua @supabase/ssr). Không throw; mã lỗi là key `errors.*`.
import { OtpInput, PhoneInput, toE164 } from '@hp/shared';
import type { MyProfile } from './profile';
import { toAuthError } from './auth-error';
import { type Client, type Result, fail, ok } from './result';

/** Lỗi Zod đầu tiên → mã i18n (schema ở @hp/shared dùng message = key errors.*). */
function firstIssue(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? 'invalid_input';
}

/** Bước 1: gửi mã OTP tới số người dùng gõ (0912…, +84…). Trả số đã chuẩn hoá `84…` cho bước 2. */
export async function sendPhoneOtp(client: Client, input: unknown): Promise<Result<{ phone: string }>> {
  const parsed = PhoneInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error.issues));
  const { phone } = parsed.data;
  const { error } = await client.auth.signInWithOtp({ phone: toE164(phone), options: { channel: 'sms' } });
  if (error) return { data: null, error: toAuthError(error) };
  return ok({ phone });
}

/** Bước 2: xác nhận mã. Thành công → client có phiên đăng nhập; trigger DB đã tạo profiles. */
export async function verifyPhoneOtp(client: Client, input: unknown): Promise<Result<{ userId: string }>> {
  const parsed = OtpInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error.issues));
  const { phone, token } = parsed.data;
  const { data, error } = await client.auth.verifyOtp({ phone: toE164(phone), token, type: 'sms' });
  if (error) return { data: null, error: toAuthError(error) };
  if (!data.user) return fail('otp_invalid');
  return ok({ userId: data.user.id });
}

/**
 * Google OAuth. Web: trình duyệt tự chuyển trang (redirectTo = /auth/callback).
 * App: `skipBrowserRedirect: true`, mở `url` bằng expo-web-browser rồi gọi `exchangeCodeForSession` với `code` trả về.
 */
export async function signInWithGoogle(
  client: Client,
  options: { redirectTo: string; skipBrowserRedirect?: boolean },
): Promise<Result<{ url: string }>> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: options.redirectTo, skipBrowserRedirect: options.skipBrowserRedirect ?? false },
  });
  if (error) return { data: null, error: toAuthError(error) };
  return ok({ url: data.url });
}

/** Đổi `code` (PKCE) từ OAuth callback lấy phiên đăng nhập. */
export async function exchangeCodeForSession(client: Client, code: string): Promise<Result<{ userId: string }>> {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) return { data: null, error: toAuthError(error) };
  return ok({ userId: data.user.id });
}

/** Đăng xuất trên thiết bị / trình duyệt này. App: xoá push token TRƯỚC khi gọi (src/core/auth). */
export async function signOut(client: Client): Promise<Result<null>> {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) return { data: null, error: toAuthError(error) };
  return ok(null);
}

/** Chưa đồng ý điều khoản hoặc chưa có tên → cần qua onboarding trước khi dùng tính năng cần đăng nhập. */
export function needsOnboarding(profile: Pick<MyProfile, 'consent_at' | 'full_name'>): boolean {
  return !profile.consent_at || profile.full_name.trim().length === 0;
}
