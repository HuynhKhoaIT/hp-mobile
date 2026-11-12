// Header của mini-app (Stitch pass_home / saved / manage / filter) — dải xanh primary bo đáy (bo xl từ 640px), hoạ tiết
// HeaderDecor, chữ on-primary; ngay dưới là dải tab desktop (MiniAppTabStrip, từ 640px).
// - MiniAppHomeHeader (trang chủ /pass-do, cả khi đang lọc): viên "← {APP_NAME} Super App" (về Hub) │ Đã lưu (tim — cùng icon
//   tab Đã lưu) + chuông (chỉ điện thoại — từ 640px header chung + dải tab đã có); hàng link này nằm NGOÀI form tìm → ô icon
//   túi nền cam + tên mini-app + nhãn MINI-APP + dòng phụ │ chọn khu (viên thuốc, ?site=) → ô tìm (?q=). Form GET
//   (role="search") tới trang chủ mini-app: chạy khi tắt JS (đổi khu có JS thì gửi ngay); giữ các bộ lọc khác đang dùng qua
//   input ẩn. Tên mini-app là <h1> khi chưa lọc — kèm tiêu đề SEO của danh sách dạng sr-only (web.listing.<tính năng>.title:
//   H1 có từ khoá cho máy tìm kiếm / trình đọc màn hình, mắt thường vẫn thấy thương hiệu); đang lọc thì H1 là tiêu đề kết quả
//   ("Pass đồ gần {khu}", "Kết quả cho …") — `titleAs`.
// - MiniAppPageHeader (trang con): viên "← {Chợ Pass}" (về trang chủ mini-app) + phần phụ bên phải (`aside`, vd "Đặt lại") →
//   dòng nhỏ (eyebrow) + <h1> + phần phụ cạnh tiêu đề (`titleAside`, vd số tin) → `children` (vd ô tìm).
// Khác Stitch (cố ý): không nút camera / quét QR trong ô tìm, không "1.400+ tin mới" — chưa có dữ liệu / tính năng.
import type { Site } from '@hp/core';
import { APP_NAME, type Locale } from '@hp/shared';
import { ArrowLeft, Heart, Search, ShoppingBag } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { getPathname, Link } from '@/i18n/navigation';
import { filterQuery, type ListFilterState } from '../../filters';
import type { MiniAppConfig } from '../../mini-app';
import { SiteSelect } from '../site-select';
import { MiniAppTabStrip } from './mini-app-nav';

const PANEL = 'relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl';
const PILL =
  'inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-on-primary/15 pr-4 pl-3 text-sm font-semibold outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/60';
const ROUND =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-on-primary/15 text-on-primary outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/60';

function BackPill({ href, label, title }: { href: string; label: string; title?: string }) {
  return (
    <Link href={href} title={title} className={PILL}>
      <ArrowLeft aria-hidden strokeWidth={2} className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export async function MiniAppHomeHeader({
  cfg,
  filters,
  sites,
  locale,
  titleAs: Title,
}: {
  cfg: MiniAppConfig;
  filters: ListFilterState;
  sites: Site[];
  locale: Locale;
  titleAs: 'h1' | 'p';
}) {
  const t = await getTranslations();
  const { miniApp } = cfg;
  const featureName = t(`common.feature.${cfg.feature}`);
  // Bộ lọc khác (danh mục, giá, khoảng cách…) giữ nguyên khi tìm / đổi khu.
  const keep = Object.entries(filterQuery(filters)).filter(([key]) => key !== 'q' && key !== 'site');

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
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">
              <Link href={miniApp.paths.saved} aria-label={t('listing.mini_app.tabs.saved')} className={ROUND}>
                <Heart aria-hidden strokeWidth={1.75} className="size-6" />
              </Link>
              <NotificationBell variant="onPrimary" />
            </div>
          </div>

          <form action={getPathname({ href: cfg.path, locale })} role="search" className="flex flex-col gap-4">
            {keep.map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-on-accent shadow-card">
                <ShoppingBag strokeWidth={2} className="size-6" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Title className="text-2xl leading-tight font-bold">
                    {t(miniApp.titleKey)}
                    {Title === 'h1' ? (
                      <>
                        {' '}
                        <span className="sr-only">{t(`web.listing.${cfg.feature}.title`)}</span>
                      </>
                    ) : null}
                  </Title>
                  <span className="rounded-sm bg-on-primary/15 px-2 py-0.5 text-xs font-bold tracking-wide">
                    {t('listing.mini_app.badge')}
                  </span>
                </div>
                <p className="text-sm text-on-primary/90">{t(miniApp.subtitleKey)}</p>
              </div>
              {sites.length > 0 ? (
                <SiteSelect
                  key={`site:${filters.site ?? ''}`}
                  sites={sites}
                  value={filters.site}
                  label={t('listing.mini_app.home.site_pick')}
                  anyLabel={t('listing.list.site_any')}
                  className="w-full sm:w-56"
                  selectClassName="rounded-full border-transparent font-semibold shadow-card"
                />
              ) : null}
            </div>

            <div className="flex gap-2">
              <label className="relative block flex-1">
                <span className="sr-only">{t('listing.list.search_placeholder', { feature: featureName })}</span>
                <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
                <Input
                  name="q"
                  type="search"
                  defaultValue={filters.query}
                  placeholder={t('listing.list.search_placeholder', { feature: featureName })}
                  maxLength={100}
                  className="rounded-full border-transparent pl-11 shadow-card focus-visible:ring-on-primary/60"
                />
              </label>
              <Button type="submit" size="lg" variant="outline" className="rounded-full border-transparent font-semibold text-primary shadow-card">
                {t('listing.list.search_submit')}
              </Button>
            </div>
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
            {eyebrow ? <p className="text-xs font-semibold tracking-wide text-on-primary/90 uppercase">{eyebrow}</p> : null}
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

/** Nút / link nhỏ trên header xanh (vd "Đặt lại" của trang bộ lọc). */
export const MINI_APP_HEADER_ACTION =
  'inline-flex min-h-11 items-center rounded-full bg-on-primary/15 px-4 text-sm font-semibold text-on-primary outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/60';
