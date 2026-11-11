// Phần hồ sơ của trang "Tôi" (/toi), style Stitch "Trang cá nhân & Quản lý tin đăng". Đọc hồ sơ theo request → trong Suspense.
// Đã đăng nhập, từ trên xuống:
//   1 header xanh (cùng hoạ tiết HubHeader trang chủ; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): "Tôi" + nút
//     tròn Cài đặt; thẻ hồ sơ trong mờ — ảnh đại diện 64 (bấm để đổi: AvatarPicker compact) + dấu xác minh khi có huy hiệu,
//     tên, pill khu làm việc, "Tham gia {ngày}" (không hiện SĐT); chưa hoàn thiện hồ sơ → nút "Hoàn thiện ngay".
//   2 dải số liệu (MeStats)   3 thẻ Huy hiệu xác minh (thay "điểm uy tín" của Stitch — không có dữ liệu đó)
//   4 lối tắt 3 ô: Đăng tin · Tin của tôi · Nhóm của tôi   5 khối "Tin của tôi" (MyListingsPreview: chip + 3 thẻ quản lý)
// Khách: header gọn (tiêu đề + lời mời + nút Đăng nhập). Phần "Cài đặt & hỗ trợ" + miễn trừ ở MeSettings (page).
// Web chưa có trang hồ sơ công khai (/u/[id]) → không có nút "Xem hồ sơ" như app.
import { needsOnboarding } from '@hp/core';
import { formatDate } from '@hp/shared';
import { Check, ChevronRight, FileText, LogIn, MapPin, Plus, Settings, ShieldCheck, UserRoundPen, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getMyProfileForPage, getSitesForPage } from '@/features/auth/queries';
import { asLocale } from '@/features/listing/display';
import { MyListingsPreview } from '@/features/listing/components/my-listings-preview';
import { AvatarPicker } from '@/features/profile/components/avatar-picker';
import { MeStats } from '@/features/profile/components/me-stats';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Nút / pill trong mờ trên nền primary (giống HubHeader): chữ on-primary trên primary pha 15% vẫn ≥ 4,5:1. */
const GLASS = 'border border-on-primary/20 bg-on-primary/15';
const ON_PRIMARY_FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-on-primary/60';
/** Nút đặc trên header xanh (nền surface, chữ primary). */
const SOLID =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-surface px-4 text-md font-semibold text-primary shadow-card transition-colors hover:bg-primary-light';

function Hero({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
      <HeaderDecor />
      <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 sm:pt-6 sm:pb-6">{children}</div>
    </div>
  );
}

export async function MyAccount() {
  const t = await getTranslations();
  const profile = await getMyProfileForPage();
  if (profile.error?.code === 'auth_required') {
    return (
      <Hero>
        <h1 className="text-xl font-bold">{t('common.nav.me')}</h1>
        <p className="max-w-md text-md text-on-primary/90">{t('web.me.guest_body')}</p>
        <div className="flex">
          <LoginDialog
            trigger={
              <button type="button" className={cn(SOLID, ON_PRIMARY_FOCUS)}>
                <LogIn aria-hidden strokeWidth={1.75} className="size-5" />
                {t('auth.sign_in')}
              </button>
            }
          />
        </div>
      </Hero>
    );
  }
  if (profile.error) {
    const key = `errors.${profile.error.code}`;
    return (
      <div className="px-4 sm:px-0">
        <EmptyState
          title={t('common.states.error_title')}
          description={t.has(key) ? t(key) : t('errors.unknown')}
          action={
            <Button asChild variant="outline">
              <Link href="/toi">{t('common.actions.retry')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const me = profile.data;
  const locale = asLocale(await getLocale());
  const sites = await getSitesForPage();
  const siteName = sites.data?.find((s) => s.code === me.site)?.name;
  const verified = me.badges.length > 0;
  const badgeNames = me.badges.filter((b) => t.has(`listing.owner_badge.${b}`)).map((b) => t(`listing.owner_badge.${b}`));

  return (
    <>
      <Hero>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{t('common.nav.me')}</h1>
          <Link
            href="/toi/cai-dat"
            aria-label={t('web.me.settings')}
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-on-primary/25',
              GLASS,
              ON_PRIMARY_FOCUS,
            )}
          >
            <Settings aria-hidden strokeWidth={1.75} className="size-6" />
          </Link>
        </div>

        <div className={cn('flex items-center gap-3.5 rounded-lg p-3.5', GLASS)}>
          <div className="relative shrink-0">
            <AvatarPicker compact userId={me.id} initialValue={me.avatar_url} label={t('web.me.avatar')} />
            {verified ? (
              <span
                role="img"
                aria-label={t('common.profile.verified')}
                className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-primary"
              >
                <Check aria-hidden strokeWidth={3} className="size-3.5" />
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <p className="line-clamp-2 text-lg leading-snug font-bold">{me.full_name || t('common.nav.me')}</p>
            {siteName ? (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-on-primary/20 px-2.5 py-0.5 text-xs font-semibold">
                <MapPin aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />
                <span className="sr-only">{t('web.me.site')} </span>
                <span className="truncate">{siteName}</span>
              </span>
            ) : null}
            <p className="text-sm text-on-primary/90">
              {t('common.profile.member_since', { date: formatDate(me.created_at, locale) })}
            </p>
          </div>
        </div>

        {needsOnboarding(me) ? (
          <Link href={{ pathname: '/dang-nhap', query: { next: '/toi' } }} className={cn(SOLID, ON_PRIMARY_FOCUS)}>
            <UserRoundPen aria-hidden strokeWidth={1.75} className="size-5" />
            {t('common.home.card.onboarding_cta')}
          </Link>
        ) : null}
      </Hero>

      <div className="flex flex-col gap-6 px-4 sm:px-0">
        <MeStats ratingAvg={me.rating_avg} ratingCount={me.rating_count} />

        {/* Thẻ huy hiệu (thay "điểm uy tín" của Stitch): nền nhạt primary-light → surface. Phụ đề: huy hiệu đã có, chưa có → lời giới thiệu. */}
        <Link
          href="/toi/huy-hieu"
          className="flex min-h-16 items-center gap-3 rounded-lg border border-primary/15 bg-linear-to-r from-primary-light to-surface p-4 shadow-card outline-none transition-colors hover:border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
            <ShieldCheck strokeWidth={1.75} className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-md font-bold text-fg">{t('common.badge_request.title')}</span>
            <span className="line-clamp-2 text-sm text-muted">
              {badgeNames.length > 0 ? badgeNames.join(' · ') : t('common.badge_request.intro')}
            </span>
          </span>
          <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-primary" />
        </Link>

        <Shortcuts
          items={[
            { href: '/dang-tin', label: t('listing.list.post_cta'), Icon: Plus, box: 'bg-accent text-on-accent' },
            { href: '/toi/tin-cua-toi', label: t('listing.manage.title'), Icon: FileText, box: 'bg-primary-light text-primary' },
            { href: '/toi/nhom-cua-toi', label: t('group.mine.title'), Icon: Users, box: 'bg-service-ride-soft text-service-ride' },
          ]}
        />

        <MyListingsPreview />
      </div>
    </>
  );
}

function Shortcuts({
  items,
}: {
  items: { href: string; label: string; Icon: typeof Plus; box: string }[];
}) {
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {items.map(({ href, label, Icon, box }) => (
        <li key={href} className="flex">
          <Link
            href={href}
            className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 text-center shadow-card outline-none transition hover:-translate-y-0.5 hover:border-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden className={cn('flex size-10 items-center justify-center rounded-full', box)}>
              <Icon strokeWidth={1.75} className="size-5" />
            </span>
            <span className="line-clamp-2 text-sm leading-tight font-semibold text-fg">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Fallback Suspense: header xanh + dải số cùng khung (không nhảy bố cục khi hồ sơ về). */
export function MyAccountSkeleton() {
  return (
    <>
      <Hero>
        <div className="flex min-h-11 items-center justify-between gap-3" aria-hidden>
          <span className="h-7 w-16 animate-pulse rounded-sm bg-on-primary/15 motion-reduce:animate-none" />
          <span className="size-11 animate-pulse rounded-full bg-on-primary/15 motion-reduce:animate-none" />
        </div>
        <div className={cn('flex items-center gap-3.5 rounded-lg p-3.5', GLASS)} aria-hidden>
          <span className="size-16 shrink-0 animate-pulse rounded-full bg-on-primary/20 motion-reduce:animate-none" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-6 w-2/3 animate-pulse rounded-sm bg-on-primary/20 motion-reduce:animate-none" />
            <span className="h-5 w-1/3 animate-pulse rounded-full bg-on-primary/20 motion-reduce:animate-none" />
            <span className="h-4 w-1/2 animate-pulse rounded-sm bg-on-primary/20 motion-reduce:animate-none" />
          </span>
        </div>
      </Hero>
      <div className="px-4 sm:px-0" aria-hidden>
        <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface px-2 py-4 shadow-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 px-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
