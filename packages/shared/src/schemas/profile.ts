// Input sửa hồ sơ — dùng cho form app / web và Server Action. Khớp ràng buộc cột public.profiles.
// Cột server quản (role, badges, is_banned, rating_*, phone) không có ở đây; DB cũng chặn bằng trigger guard.
import { z } from 'zod';
import { FEATURES } from '../enums';
import { LOCALES } from '../locales';

export const SiteCode = z.string().regex(/^[a-z0-9_]+$/, 'invalid_site');

export const UpdateProfileInput = z
  .object({
    full_name: z.string().trim().min(1, 'required').max(80, 'too_long'),
    avatar_url: z.string().max(500).nullable(),
    site: SiteCode.nullable(),
    department: z.string().trim().max(80, 'too_long').nullable(),
    locale: z.enum(LOCALES),
    notification_prefs: z.record(z.string(), z.boolean()),
    interests: z.array(z.enum(FEATURES)).max(FEATURES.length),
  })
  .partial()
  .strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;

/** Bước onboarding: tên bắt buộc, khu + quan tâm tuỳ chọn (bỏ qua được), ghi nhận đồng ý (Nghị định 13/2023). */
export const OnboardingInput = z
  .object({
    full_name: z.string().trim().min(1, 'required').max(80, 'too_long'),
    locale: z.enum(LOCALES),
    site: SiteCode.nullable().optional(),
    interests: z.array(z.enum(FEATURES)).max(FEATURES.length).optional(),
    consent_version: z.string().min(1),
  })
  .strict();
export type OnboardingInput = z.infer<typeof OnboardingInput>;
