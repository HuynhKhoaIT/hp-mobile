// Map lỗi Supabase Auth sang mã i18n `errors.*`. Không import runtime (test được bằng node --test).
import type { AppError } from './result';

type AuthLikeError = { code?: string; status?: number; message?: string; name?: string };

/** Map lỗi Supabase Auth (AuthError.code / status) sang mã i18n. */
export function toAuthError(err: unknown): AppError {
  const e = (err ?? {}) as AuthLikeError;
  const message = e.message ?? 'unknown';
  switch (e.code) {
    case 'over_sms_send_rate_limit':
    case 'over_request_rate_limit':
      return { code: 'rate_limited', message };
    case 'otp_expired':
    case 'invalid_credentials':
      return { code: 'otp_invalid', message };
    case 'sms_send_failed':
    case 'phone_provider_disabled':
    case 'hook_timeout':
    case 'unexpected_failure':
      return { code: 'sms_failed', message };
    case 'validation_failed':
      return { code: 'phone_invalid', message };
    case 'user_banned':
      return { code: 'banned', message };
  }
  if (e.status === 429) return { code: 'rate_limited', message };
  if (e.name === 'AuthRetryableFetchError' || e.name === 'TypeError' || /fetch|network/i.test(message)) {
    return { code: 'network', message };
  }
  return { code: 'unknown', message };
}
