// Thẻ người đăng (trang chi tiết): ảnh đại diện / chữ cái đầu, tên rút gọn (view đã che: "An N."), tham gia từ,
// đánh giá, huy hiệu. Không có SĐT (chỉ lộ qua reveal_contact sau đăng nhập — tuần 5).
import type { PublicListing } from '@hp/core';
import { formatDate, formatNumber, type Locale } from '@hp/shared';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { profileAvatarUrl } from '@/lib/images';

export function PosterCard({ listing, locale }: { listing: PublicListing; locale: Locale }) {
  const t = useTranslations();
  const avatar = profileAvatarUrl(listing.owner_avatar_url);
  const name = listing.owner_name ?? '';
  const badges = listing.owner_badges.filter((b) => t.has(`listing.owner_badge.${b}`));

  return (
    <section aria-labelledby="poster-heading" className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <h2 id="poster-heading" className="text-sm font-medium text-muted">
        {t('listing.detail.posted_by')}
      </h2>
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-primary-light">
          {avatar ? (
            <Image src={avatar} alt="" fill unoptimized sizes="48px" className="object-cover" />
          ) : (
            <span aria-hidden className="flex size-full items-center justify-center text-lg font-semibold text-primary">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-md font-semibold text-fg">{name}</p>
          <p className="text-sm text-muted">
            {t('listing.detail.member_since', { date: formatDate(listing.owner_since, locale) })}
          </p>
          <p className="text-sm text-muted">
            {listing.owner_rating_count > 0
              ? t('listing.detail.rating', {
                  avg: formatNumber(Math.round(listing.owner_rating_avg * 10) / 10, locale),
                  count: listing.owner_rating_count,
                })
              : t('listing.detail.no_rating')}
          </p>
        </div>
      </div>
      {badges.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {badges.map((b) => (
            <li key={b}>
              <Badge tone="success">{t(`listing.owner_badge.${b}`)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
