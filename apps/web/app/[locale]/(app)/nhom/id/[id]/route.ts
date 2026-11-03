// /nhom/id/[id] — chuyển tới /nhom/{slug} theo id nhóm. Thông báo (notifications.data = { screen: 'group', params: { id } })
// chỉ mang id; /thong-bao (và nơi khác chỉ có id) điều hướng tới đây. 307 (không 308): slug đổi khi chủ nhóm sửa tiêu đề.
// Không có / đã xoá / id sai / lỗi đọc → chuyển tới một slug không tồn tại để hiện not-found.tsx của /nhom/[slug]
// ("Nhóm không còn" + đường về danh sách) thay vì trang lỗi trống.
// `?danh-gia=1` (thông báo group_completed) → thêm #danh-gia để trang nhóm tự mở dialog đánh giá chủ nhóm.
import { NextResponse } from 'next/server';
import { getGroupSlugById } from '@/features/group/queries';
import { RATE_HASH } from '@/features/group/rate-link';
import { asLocale } from '@/features/listing/display';
import { getPathname } from '@/i18n/navigation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, ctx: RouteContext<'/[locale]/nhom/id/[id]'>) {
  const { locale, id } = await ctx.params;
  const slug = UUID.test(id) ? await getGroupSlugById(id).catch(() => null) : null;
  const href = getPathname({ href: `/nhom/${slug ?? 'khong-ton-tai-000000'}`, locale: asLocale(locale) });
  const rate = slug && new URL(request.url).searchParams.has(RATE_HASH) ? `#${RATE_HASH}` : '';
  return NextResponse.redirect(new URL(href + rate, request.url), { status: 307, headers: { 'Cache-Control': 'no-store' } });
}
