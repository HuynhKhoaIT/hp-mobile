// Header + thẻ hồ sơ công khai (/u/[id]) — style Stitch "Hồ sơ công khai người khác", khớp app (PublicProfileCard +
// PageHero của apps/mobile/app/profile/[id].tsx). Dữ liệu public_profiles: tên "An N.", không SĐT, không vị trí.
//   header xanh (HeaderDecor; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): "Hồ sơ thành viên" + dòng phụ
//   "không hiện số điện thoại" → thẻ nổi đè mép header: ảnh đại diện 64 + dấu xác minh (nền primary, khi có huy hiệu) | tên
//   (H1) · "Đã xác minh" · khu làm việc · "Tham gia {ngày}" → dải 3 số liệu trên nền bg (giống PosterCard): đánh giá (★) ·
//   tham gia · số huy hiệu → huy hiệu xác minh (Badge success) hoặc dòng "chưa có huy hiệu" → hành động (PublicProfileActions:
//   Báo cáo / Chặn, nhắc hồ sơ của mình / đã chặn — client island).
// Khác Stitch (cố ý): không tuổi, xưởng / tổ, "trực tuyến", tỉ lệ phản hồi (không có dữ liệu / là PII); không nút Zalo / Gọi
// (SĐT chỉ lộ qua reveal_contact ở tin), "Lưu danh thiếp & Theo dõi" (chưa có tính năng), Chia sẻ hồ sơ (shareUrl chưa có
// loại hồ sơ); nút Báo cáo dạng nút chữ trong thẻ thay vì menu "⋮" trên header.
import type { PublicProfile } from '@hp/core';
import { formatDate, formatNumber, type Locale } from '@hp/shared';
import { Check, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/shared/badge';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Skeleton } from '@/components/ui/skeleton';
import { profileAvatarUrl } from '@/lib/images';
import { PublicProfileActions } from './public-profile-actions';

export async function PublicProfileHero() {
  const t = await getTranslations('common.profile');
  return (
    <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
      <HeaderDecor />
      <div className="relative flex flex-col gap-0.5 px-4 pt-4 pb-8 sm:px-6 sm:pt-6 sm:pb-10">
        <p className="text-xl font-bold sm:text-2xl">{t('public_title')}</p>
        <p className="text-sm text-on-primary/90 sm:text-md">{t('public_subtitle')}</p>
      </div>
    </div>
  );
}

export async function PublicProfileCard({
  profile: p,
  siteName,
  locale,
}: {
  profile: PublicProfile;
  siteName: string | null;
  locale: Locale;
}) {
  const t = await getTranslations();
  const name = p.display_name || t('chat.inbox.deleted_user');
  const avatar = profileAvatarUrl(p.avatar_url);
  const badges = p.badges.filter((b) => t.has(`listing.owner_badge.${b}`));
  const verified = badges.length > 0;
  const rated = p.rating_count > 0;

  return (
    <section
      aria-labelledby="profile-name"
      className="relative mx-4 -mt-5 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:mx-6 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="relative size-16 overflow-hidden rounded-full bg-primary-light">
            {avatar ? (
              <Image src={avatar} alt="" fill unoptimized sizes="64px" className="object-cover" />
            ) : (
              <span aria-hidden className="flex size-full items-center justify-center text-2xl font-semibold text-primary">
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {verified ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-on-primary"
            >
              <Check strokeWidth={3} className="size-3.5" />
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 id="profile-name" className="text-xl leading-snug font-bold break-words text-fg">
            {name}
            {verified ? <span className="sr-only">, {t('common.profile.verified')}</span> : null}
          </h1>
          {verified ? <p className="text-sm font-semibold text-success">{t('common.profile.verified')}</p> : null}
          {siteName ? (
            <p className="flex items-center gap-1 text-sm font-medium text-primary">
              <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
              <span className="truncate">{siteName}</span>
            </p>
          ) : null}
          <p className="text-sm text-muted">{t('common.profile.member_since', { date: formatDate(p.created_at, locale) })}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 rounded-md bg-bg py-2.5 text-center">
        <div className="flex flex-col-reverse gap-0.5 px-2">
          <dt className="text-sm text-muted">
            {rated ? t('common.profile.ratings', { count: p.rating_count }) : t('listing.detail.stat_rating')}
          </dt>
          <dd className="flex items-center justify-center gap-1 text-lg font-bold text-fg">
            {rated ? formatNumber(Math.round(p.rating_avg * 10) / 10, locale) : t('listing.detail.no_rating_short')}
            {rated ? <Star aria-hidden strokeWidth={1.75} className="size-4 fill-warning text-warning" /> : null}
          </dd>
        </div>
        <div className="flex flex-col-reverse gap-0.5 border-l border-border px-2">
          <dt className="text-sm text-muted">{t('listing.detail.stat_joined')}</dt>
          <dd className="text-lg font-bold text-fg">{formatDate(p.created_at, locale)}</dd>
        </div>
        <div className="flex flex-col-reverse gap-0.5 border-l border-border px-2">
          <dt className="text-sm text-muted">{t('common.profile.stat_badges')}</dt>
          <dd className="text-lg font-bold text-primary">{formatNumber(badges.length, locale)}</dd>
        </div>
      </dl>

      {verified ? (
        <ul aria-label={t('common.badge_request.title')} className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <li key={b}>
              <Badge tone="success">{t(`listing.owner_badge.${b}`)}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t('common.profile.no_badges')}</p>
      )}

      <PublicProfileActions userId={p.id} name={name} />
    </section>
  );
}

/** Khung chờ cùng hình header + thẻ (loading.tsx / Suspense). */
export function PublicProfileCardSkeleton() {
  return (
    <div className="relative mx-4 -mt-5 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:mx-6 sm:p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-6 w-1/2 rounded-full" />
    </div>
  );
}
