// Header của mini-app (Stitch pass_home / room_home / saved / manage / filter) — dải gradient màu mini-app (from-app-from →
// to-app-to: khung trang gắn data-app-theme nên Chợ Pass cam đất, Nhà Trọ ngọc lục bảo…) bo đáy (bo xl từ 640px), hoạ tiết
// HeaderDecor; ngay dưới là dải tab desktop (MiniAppTabStrip, từ 640px).
// Chữ / nút trên gradient dùng on-accent (trắng ở cả sáng lẫn tối): gradient mini-app đậm ở cả hai chế độ ("chữ trắng" —
// appThemes của @hp/tokens), còn on-primary ở chế độ tối là màu tối (cho nền primary sáng) → không đọc được trên gradient.
// - MiniAppHomeHeader (trang chủ, cả khi đang lọc) — theo config.miniApp.header:
//   'market' (Chợ Pass): viên "← {APP_NAME} Super App" (về Hub) │ Đã lưu (tim) + chuông (chỉ điện thoại — từ 640px header
//     chung + dải tab đã có) → ô icon nền trắng (header đã cam đất — ô cam cũ chìm vào nền) + tên mini-app + nhãn MINI-APP
//     + dòng phụ │ chọn khu (viên thuốc, ?site=) → ô tìm (?q=) + nút Tìm.
//   'directory' (Nhà Trọ): viên "← Super App" │ nhãn mini-app (vd "Nhà trọ KKT") + Đã lưu + chuông (điện thoại) → tên + dòng
//     phụ → "Gần bạn" + chọn khu cả hàng → ô tìm + nút vuông tới trang bộ lọc (giữ tham số, kèm số bộ lọc đang dùng).
//   Form GET (role="search") tới trang chủ mini-app: chạy khi tắt JS (đổi khu có JS thì gửi ngay; Enter trong ô tìm gửi form);
//   giữ các bộ lọc khác đang dùng qua input ẩn. Tên mini-app là <h1> khi chưa lọc — kèm tiêu đề SEO của danh sách dạng
//   sr-only (web.listing.<tính năng>.title: H1 có từ khoá cho máy tìm kiếm / trình đọc màn hình, mắt thường vẫn thấy thương
//   hiệu); đang lọc thì H1 là tiêu đề kết quả ("Phòng trọ gần {khu}", "Kết quả cho …") — `titleAs`.
// - MiniAppPageHeader (trang con): viên "← {Chợ Pass | Tìm trọ}" (về trang chủ mini-app) + phần phụ bên phải (`aside`, vd "Đặt
//   lại") → dòng nhỏ (eyebrow) + <h1> + phần phụ cạnh tiêu đề (`titleAside`, vd số tin) → `children` (vd ô tìm).
// Khác Stitch (cố ý): không nút camera / quét QR trong ô tìm, không "1.400+ tin mới", không hotline — chưa có dữ liệu / tính năng.
import type { Site } from '@hp/core';
import { APP_NAME, type Locale } from '@hp/shared';
import { ArrowLeft, Heart, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { getPathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { activeFilterCount, filterQuery, type ListFilterState } from '../../filters';
import type { MiniAppConfig } from '../../mini-app';
import { SiteSelect } from '../site-select';
import { MiniAppTabStrip } from './mini-app-nav';

const PANEL = 'relative overflow-hidden rounded-b-xl bg-linear-to-r from-app-from to-app-to text-on-accent sm:rounded-xl';
const ON_GRADIENT = 'bg-on-accent/15 text-on-accent outline-none transition-colors hover:bg-on-accent/25 focus-visible:ring-3 focus-visible:ring-on-accent/60';
const PILL = cn('inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold', ON_GRADIENT);
const ROUND = cn('inline-flex size-11 shrink-0 items-center justify-center rounded-full', ON_GRADIENT);

function BackPill({ href, label, title }: { href: string; label: string; title?: string }) {
  return (
    <Link href={href} title={title} className={PILL}>
      <ArrowLeft aria-hidden strokeWidth={2} className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

type HomeHeaderProps = {
  cfg: MiniAppConfig;
  filters: ListFilterState;
  sites: Site[];
  locale: Locale;
  titleAs: 'h1' | 'p';
};

export async function MiniAppHomeHeader({ cfg, filters, sites, locale, titleAs: Title }: HomeHeaderProps) {
  const t = await getTranslations();
  const { miniApp } = cfg;
  const { header } = miniApp;
  const featureName = t(`common.feature.${cfg.feature}`);
  // Bộ lọc khác (danh mục, giá, khoảng cách…) giữ nguyên khi tìm / đổi khu.
  const keep = Object.entries(filterQuery(filters)).filter(([key]) => key !== 'q' && key !== 'site');
  const searchLabel = t('listing.list.search_placeholder', { feature: featureName });

  const title = (
    <Title className="text-2xl leading-tight font-bold">
      {t(miniApp.titleKey)}
      {Title === 'h1' ? (
        <>
          {' '}
          <span className="sr-only">{t(`web.listing.${cfg.feature}.title`)}</span>
        </>
      ) : null}
    </Title>
  );
  const siteSelect = (className: string, label: string) =>
    sites.length > 0 ? (
      <SiteSelect
        key={`site:${filters.site ?? ''}`}
        sites={sites}
        value={filters.site}
        label={label}
        anyLabel={t('listing.list.site_any')}
        className={className}
        selectClassName="rounded-full border-transparent font-semibold shadow-card"
      />
    ) : null;
  const searchInput = (
    <label className="relative block flex-1">
      <span className="sr-only">{searchLabel}</span>
      <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <Input
        name="q"
        type="search"
        defaultValue={filters.query}
        placeholder={searchLabel}
        maxLength={100}
        className="rounded-full border-transparent pl-11 shadow-card focus-visible:ring-on-accent/60"
      />
    </label>
  );
  const count = activeFilterCount(filters) + (filters.sort !== 'newest' ? 1 : 0);

  return (
    <>
      <div className={PANEL}>
        <HeaderDecor />
        <div className="relative flex flex-col gap-4 px-4 pt-3 pb-5 sm:p-6">
          <div className="flex items-center gap-2">
            <BackPill
              href="/"
              label={t('listing.mini_app.back_super', { app: APP_NAME })}
              title={t('listing.mini_app.back_super_a11y', { app: APP_NAME })}
            />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {header.variant === 'directory' ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-on-accent/15 px-3 py-1.5 text-xs font-bold tracking-wide uppercase">
                  <cfg.Icon aria-hidden strokeWidth={2} className="size-4 shrink-0 text-warning" />
                  <span className="truncate">{t(header.badgeKey)}</span>
                </span>
              ) : null}
              <Link href={miniApp.paths.saved} aria-label={t('listing.mini_app.tabs.saved')} className={cn(ROUND, 'sm:hidden')}>
                <Heart aria-hidden strokeWidth={1.75} className="size-6" />
              </Link>
              <NotificationBell variant="onPrimary" className={cn(ROUND, 'sm:hidden')} />
            </div>
          </div>

          <form action={getPathname({ href: cfg.path, locale })} role="search" className="flex flex-col gap-4">
            {keep.map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}

            {header.variant === 'market' ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface text-primary shadow-card">
                    <header.Icon strokeWidth={2} className="size-6" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {title}
                      <span className="rounded-sm bg-on-accent/15 px-2 py-0.5 text-xs font-bold tracking-wide">
                        {t('listing.mini_app.badge')}
                      </span>
                    </div>
                    <p className="text-sm text-on-accent/90">{t(miniApp.subtitleKey)}</p>
                  </div>
                  {siteSelect('w-full sm:w-56', t('listing.mini_app.home.site_pick'))}
                </div>
                <div className="flex gap-2">
                  {searchInput}
                  <Button type="submit" size="lg" variant="outline" className="rounded-full border-transparent font-semibold text-primary shadow-card">
                    {t('listing.list.search_submit')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  {title}
                  <p className="text-sm text-on-accent/90 sm:text-md">{t(miniApp.subtitleKey)}</p>
                </div>
                {sites.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                      <MapPin strokeWidth={2} className="size-5" />
                      {t(header.nearLabelKey)}
                    </span>
                    {siteSelect('min-w-0 flex-1 sm:max-w-sm', t(header.nearLabelKey))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  {searchInput}
                  <Link
                    href={{ pathname: miniApp.paths.filter, query: filterQuery(filters) }}
                    className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-surface text-primary shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-on-accent/60"
                  >
                    <SlidersHorizontal aria-hidden strokeWidth={1.75} className="size-6" />
                    <span className="sr-only">{t('listing.mini_app.filter.title')}</span>
                    {count > 0 ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent"
                        >
                          {count}
                        </span>
                        <span className="sr-only">{t('listing.mini_app.filter.active_count', { count })}</span>
                      </>
                    ) : null}
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
      <MiniAppTabStrip feature={cfg.feature} />
    </>
  );
}

export async function MiniAppPageHeader({
  cfg,
  title,
  eyebrow,
  aside,
  titleAside,
  children,
}: {
  cfg: MiniAppConfig;
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  titleAside?: ReactNode;
  children?: ReactNode;
}) {
  const t = await getTranslations();
  return (
    <>
      <div className={PANEL}>
        <HeaderDecor />
        <div className="relative flex flex-col gap-3 px-4 pt-3 pb-5 sm:p-6">
          <div className="flex items-center gap-2">
            <BackPill href={cfg.miniApp.paths.home} label={t(cfg.miniApp.homeTabKey)} />
            {aside ? <div className="ml-auto flex shrink-0 items-center gap-2">{aside}</div> : null}
          </div>
          <div className="flex flex-col gap-1">
            {eyebrow ? <p className="text-xs font-semibold tracking-wide text-on-accent/90 uppercase">{eyebrow}</p> : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl leading-tight font-bold">{title}</h1>
              {titleAside}
            </div>
          </div>
          {children}
        </div>
      </div>
      <MiniAppTabStrip feature={cfg.feature} />
    </>
  );
}

/** Nút / link nhỏ trên header gradient (vd "Đặt lại" của trang bộ lọc). */
export const MINI_APP_HEADER_ACTION = cn('inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold', ON_GRADIENT);
