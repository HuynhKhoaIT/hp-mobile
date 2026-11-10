// translate-content — nút "Dịch" ở chi tiết tin: trả tiêu đề + mô tả theo ngôn ngữ người xem.
// Đọc tin qua public_listings bằng JWT người gọi (tin ẩn / chặn → not_found); cùng ngôn ngữ → trả bản gốc;
// có cache listing_translations → trả cache (service role: bảng chỉ server đọc / ghi); chưa có → Google Translation v2
// (secret TRANSLATE_API_KEY; chưa cấu hình → 503 translate_unavailable), 30 lượt dịch mới / người / giờ, lưu cache.
// Đổi tiêu đề / mô tả → trigger xoá cache. Trả { title, description, lang, source: 'original' | 'cache' | 'api' }.
import { AppError, handler } from '../_shared/http.ts';
import { type Lang, parseTranslateInput, TRANSLATE_PER_HOUR, translateGoogle } from '../_shared/week10.ts';

export const translateContent = handler({ auth: 'user' }, async ({ req, db, admin, user, log }) => {
  const input = parseTranslateInput(await req.json());
  const { data: listing, error } = await db!
    .from('public_listings')
    .select('id, title, description, lang')
    .eq('id', input.listingId)
    .maybeSingle();
  if (error) throw error;
  if (!listing) throw new AppError('not_found', 404);
  if (listing.lang === input.lang) {
    return { title: listing.title, description: listing.description, lang: input.lang, source: 'original' };
  }

  // admin (service role): listing_translations không mở cho client.
  const { data: cached } = await admin
    .from('listing_translations')
    .select('title, description')
    .eq('listing_id', listing.id)
    .eq('lang', input.lang)
    .maybeSingle();
  if (cached) return { ...cached, lang: input.lang, source: 'cache' };

  const apiKey = Deno.env.get('TRANSLATE_API_KEY') ?? '';
  if (!apiKey) throw new AppError('translate_unavailable', 503);
  // admin: assert_rate_limit chỉ cấp cho service role.
  const { error: limitError } = await admin.rpc('assert_rate_limit', {
    p_key: user!.id,
    p_action: 'translate',
    p_max: TRANSLATE_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (limitError) {
    throw limitError.message === 'rate_limited' ? new AppError('rate_limited', 429) : new AppError('unknown', 500);
  }

  const texts = listing.description ? [listing.title, listing.description] : [listing.title];
  const [title, description = null] = await translateGoogle(fetch, apiKey, texts, listing.lang as Lang, input.lang);
  await admin
    .from('listing_translations')
    .upsert({ listing_id: listing.id, lang: input.lang, title, description }, { onConflict: 'listing_id,lang' });
  log('translated', { listing_id: listing.id, lang: input.lang });
  return { title, description, lang: input.lang, source: 'api' };
});
