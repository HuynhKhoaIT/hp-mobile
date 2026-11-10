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

// ── MFA TOTP (bắt buộc cho khu /admin web; .claude/rules/web-admin.md) ─────────────────────────
// Luồng: getMfaState → chưa có factor TOTP đã xác minh → enrollTotp (QR + secret) → verifyTotp; đã có → verifyTotp với
// factor đó. verifyTotp thành công → phiên nâng lên aal2 (client lưu phiên mới: cookie ở web).

export type MfaState = {
  /** aal1: mới qua OTP; aal2: đã qua TOTP trong phiên này. */
  currentLevel: 'aal1' | 'aal2' | null;
  /** Factor TOTP đã xác minh (null = cần đăng ký lần đầu). */
  totpFactorId: string | null;
};

export async function getMfaState(client: Client): Promise<Result<MfaState>> {
  const [aal, factors] = await Promise.all([client.auth.mfa.getAuthenticatorAssuranceLevel(), client.auth.mfa.listFactors()]);
  if (aal.error) return { data: null, error: toAuthError(aal.error) };
  if (factors.error) return { data: null, error: toAuthError(factors.error) };
  const level = aal.data.currentLevel;
  return ok<MfaState>({
    currentLevel: level === 'aal1' ? 'aal1' : level === 'aal2' ? 'aal2' : null,
    totpFactorId: factors.data.totp.find((f) => f.status === 'verified')?.id ?? null,
  });
}

export type TotpEnrollment = {
  factorId: string;
  /** Ảnh QR dạng data URL SVG (Supabase sinh sẵn) — hiển thị bằng <img>. */
  qrCode: string;
  /** Khoá bí mật để nhập tay vào ứng dụng xác thực. */
  secret: string;
  uri: string;
};

/**
 * Đăng ký TOTP lần đầu. Factor chưa xác minh của lần bỏ dở trước bị gỡ trước (tránh trùng tên / quá số factor).
 * `issuer` là tên hiện trong ứng dụng xác thực (Google Authenticator, Authy…).
 */
export async function enrollTotp(client: Client, v: { issuer: string; friendlyName: string }): Promise<Result<TotpEnrollment>> {
  const factors = await client.auth.mfa.listFactors();
  if (factors.error) return { data: null, error: toAuthError(factors.error) };
  for (const stale of factors.data.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified')) {
    const res = await client.auth.mfa.unenroll({ factorId: stale.id });
    if (res.error) return { data: null, error: toAuthError(res.error) };
  }
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', issuer: v.issuer, friendlyName: v.friendlyName });
  // GoTrue lấy email làm "account name" của mã TOTP: tài khoản chỉ có SĐT (không email) → 500 "Error generating QR Code".
  // Staff cần có email trong Auth (docs/RUNBOOK.md, cấp quyền moderator).
  if (error && /qr code/i.test(error.message)) return fail('mfa_enroll_failed', error.message);
  if (error) return { data: null, error: toAuthError(error) };
  return ok({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri });
}

/** Xác minh mã 6 số từ ứng dụng xác thực (challenge + verify). Thành công → phiên aal2. */
export async function verifyTotp(client: Client, v: { factorId: string; code: string }): Promise<Result<null>> {
  const code = v.code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return fail('mfa_code_invalid');
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId: v.factorId, code });
  if (error) return { data: null, error: toAuthError(error) };
  return ok(null);
}

export type SessionInfo = {
  userId: string;
  /** app_metadata.role do Auth Hook custom_access_token ghi vào JWT (có thể cũ tới khi token làm mới). */
  role: 'user' | 'moderator' | 'admin';
  aal: 'aal1' | 'aal2' | null;
};

/**
 * Người đang đăng nhập theo JWT (đã kiểm chữ ký bằng getClaims). null = chưa đăng nhập. Chỉ để điều hướng / ẩn hiện
 * (vd trang đăng nhập admin báo "không có quyền"); quyền thật do RLS / is_staff() quyết định.
 */
export async function getSessionInfo(client: Client): Promise<Result<SessionInfo | null>> {
  const { data, error } = await client.auth.getClaims();
  if (error) return { data: null, error: toAuthError(error) };
  const claims = data?.claims;
  if (!claims?.sub) return ok(null);
  const raw = (claims.app_metadata as { role?: unknown } | undefined)?.role;
  const role = raw === 'moderator' || raw === 'admin' ? raw : 'user';
  const aal: SessionInfo['aal'] = claims.aal === 'aal1' ? 'aal1' : claims.aal === 'aal2' ? 'aal2' : null;
  return ok({ userId: claims.sub, role, aal });
}
