// Thẻ người đăng (trang chi tiết, style Stitch — khớp OwnerCard của app): ảnh đại diện / chữ cái đầu + dấu xác minh khi có huy
// hiệu, tên rút gọn (view đã che: "An N."), dải 2 số liệu trên nền bg: đánh giá · tham gia từ; huy hiệu xác minh.
// Không có SĐT (chỉ lộ qua reveal_contact sau đăng nhập). Nút "Xem hồ sơ" → /u/{owner_id} (hồ sơ công khai: tin khác, báo cáo /
// chặn) như app. Khác Stitch (cố ý): không "số tin đã đăng", "thời gian phản hồi" — view công khai không có dữ liệu đó.
import type { PublicListing } from '@hp/core';
import { formatDate, formatNumber, type Locale } from '@hp/shared';
import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { profileAvatarUrl } from '@/lib/images';
import { BarHeading } from './safety-tip';

export function PosterCard({
  listing,
  locale,
  title,
}: {
  listing: PublicListing;
  locale: Locale;
  /** Tiêu đề khối (config.detail.posterTitleKey — vd "Thông tin chủ trọ"); thiếu → "Người đăng". */
  title?: string;
}) {
  const t = useTranslations();
  const avatar = profileAvatarUrl(listing.owner_avatar_url);
  const name = listing.owner_name ?? '';
  const badges = listing.owner_badges.filter((b) => t.has(`listing.owner_badge.${b}`));
  const verified = badges.length > 0;
  const rating =
    listing.owner_rating_count > 0
      ? t('listing.detail.rating', {
          avg: formatNumber(Math.round(listing.owner_rating_avg * 10) / 10, locale),
          count: listing.owner_rating_count,
        })
      : t('listing.detail.no_rating_short');

  return (
    <section aria-labelledby="poster-heading" className="flex flex-col gap-2">
      <BarHeading id="poster-heading" tone="primary">
        {title ?? t('listing.detail.posted_by')}
      </BarHeading>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="relative size-12 overflow-hidden rounded-full bg-primary-light">
              {avatar ? (
                <Image src={avatar} alt="" fill unoptimized sizes="48px" className="object-cover" />
              ) : (
                <span aria-hidden className="flex size-full items-center justify-center text-lg font-semibold text-primary">
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {verified ? (
              <span aria-hidden className="absolute -right-1 -bottom-1 rounded-full bg-surface p-0.5">
                <BadgeCheck strokeWidth={1.75} className="size-4 text-success" />
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-md font-semibold text-fg">{name}</p>
            {verified ? <p className="text-sm font-medium text-muted">{t('common.profile.verified')}</p> : null}
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/u/${listing.owner_id}`}>{t('common.profile.view')}</Link>
          </Button>
        </div>

        <dl className="grid grid-cols-2 rounded-md bg-bg py-2 text-center">
          <div className="flex flex-col-reverse gap-0.5 px-2">
            <dt className="text-sm text-muted">{t('listing.detail.stat_rating')}</dt>
            <dd className="text-md font-bold text-fg">{rating}</dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5 border-l border-border px-2">
            <dt className="text-sm text-muted">{t('listing.detail.stat_joined')}</dt>
            <dd className="text-md font-bold text-fg">{formatDate(listing.owner_since, locale)}</dd>
          </div>
        </dl>

        {badges.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <li key={b}>
                <Badge tone="success">{t(`listing.owner_badge.${b}`)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
