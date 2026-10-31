// Input đăng nhập bằng số điện thoại — dùng chung form app / web và @hp/core auth.ts.
// Mã lỗi là key i18n `errors.*`.
import { z } from 'zod';
import { OTP_LENGTH } from '../constants';
import { normalizeVnPhone } from '../phone';

/** Nhận số người dùng gõ, trả `84xxxxxxxxx`. */
export const PhoneInput = z.object({
  phone: z.string().transform((value, ctx) => {
    const normalized = normalizeVnPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'phone_invalid' });
      return z.NEVER;
    }
    return normalized;
  }),
});
export type PhoneInput = z.input<typeof PhoneInput>;

export const OtpInput = PhoneInput.extend({
  token: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), 'otp_invalid'),
});
export type OtpInput = z.input<typeof OtpInput>;
