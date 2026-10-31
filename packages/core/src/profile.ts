import { OnboardingInput, UpdateProfileInput } from '@hp/shared';
import type { Tables } from '@hp/db';
import { type Client, type Result, fail, fromSupabase, requireUserId } from './result';

/** Cột của chính mình mà client được đọc (không lấy push_tokens). */
const MY_PROFILE_COLUMNS =
  'id, phone, full_name, avatar_url, site, department, badges, locale, reputation_score, rating_avg, rating_count, role, is_banned, banned_until, notification_prefs, interests, consent_at, created_at' as const;

export type MyProfile = Pick<
  Tables<'profiles'>,
  | 'id' | 'phone' | 'full_name' | 'avatar_url' | 'site' | 'department' | 'badges' | 'locale' | 'reputation_score'
  | 'rating_avg' | 'rating_count' | 'role' | 'is_banned' | 'banned_until' | 'notification_prefs' | 'interests' | 'consent_at' | 'created_at'
>;
export type PublicProfile = Tables<'public_profiles'>;

export async function getMyProfile(client: Client): Promise<Result<MyProfile>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  return fromSupabase(
    await client.from('profiles').select(MY_PROFILE_COLUMNS).eq('id', uid.data).maybeSingle(),
    true,
  );
}

export async function updateMyProfile(client: Client, input: unknown): Promise<Result<MyProfile>> {
  const parsed = UpdateProfileInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', 'invalid_input', flattenIssues(parsed.error.issues));
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  return fromSupabase(
    await client.from('profiles').update(parsed.data).eq('id', uid.data).select(MY_PROFILE_COLUMNS).maybeSingle(),
    true,
  );
}

/** Bước cuối onboarding: tên, ngôn ngữ, khu, và ghi nhận đồng ý điều khoản. */
export async function completeOnboarding(client: Client, input: unknown): Promise<Result<MyProfile>> {
  const parsed = OnboardingInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', 'invalid_input', flattenIssues(parsed.error.issues));
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const { consent_version, ...rest } = parsed.data;
  return fromSupabase(
    await client
      .from('profiles')
      .update({ ...rest, consent_version, consent_at: new Date().toISOString() })
      .eq('id', uid.data)
      .select(MY_PROFILE_COLUMNS)
      .maybeSingle(),
    true,
  );
}

/** Hồ sơ công khai (không SĐT, tên rút gọn). Khách cũng gọi được. */
export async function getPublicProfile(client: Client, id: string): Promise<Result<PublicProfile>> {
  return fromSupabase(await client.from('public_profiles').select('*').eq('id', id).maybeSingle(), true);
}

export function flattenIssues(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const i of issues) {
    const key = i.path.map(String).join('.') || '_';
    (out[key] ??= []).push(i.message);
  }
  return out;
}

// ── Ảnh đại diện (bucket avatars, migration 20261031130000) ────────────────────────
/**
 * Upload ảnh đại diện đã nén (webp / jpeg, ≤ 1 MB, 512 px) rồi ghi path vào profiles.avatar_url.
 * Path `{userId}/{timestamp}.{ext}`: không ghi đè file cũ (policy không cho update) → CDN không giữ ảnh cũ.
 */
export async function uploadAvatar(
  client: Client,
  v: { userId: string; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' },
): Promise<Result<MyProfile>> {
  const path = `${v.userId}/${Date.now()}.${v.contentType === 'image/webp' ? 'webp' : 'jpg'}`;
  const up = await client.storage.from('avatars').upload(path, v.body, { contentType: v.contentType, upsert: false });
  if (up.error) {
    const status = (up.error as { statusCode?: string | number }).statusCode;
    return fail(String(status) === '413' ? 'file_too_large' : String(status) === '403' ? 'forbidden' : 'upload_failed');
  }
  return updateMyProfile(client, { avatar_url: path });
}
