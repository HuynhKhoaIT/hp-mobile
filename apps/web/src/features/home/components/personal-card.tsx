'use client';

// Thẻ cá nhân (docs/design/home.md §4.5, §10) — chọn một theo thứ tự: khách → chưa hoàn thiện hồ sơ → có tin
// (my_listing_stats: đang đăng / chờ duyệt / lượt xem + cảnh báo sắp hết hạn / bị từ chối) → chưa có tin.
// Đọc ở trình duyệt sau khi biết phiên (trang chủ tĩnh); skeleton cùng khung; lỗi → khối lỗi + Thử lại.
// Đăng nhập / hoàn thiện hồ sơ mở LoginDialog tại chỗ (LoginFlow tự chuyển sang bước onboarding khi đã có phiên).
import { getMyListingStats, type MyListingStats, needsOnboarding } from '@hp/core';
import { formatNumber } from '@hp/shared';
import { ChevronRight, CircleAlert, Clock, LogIn, type LucideIcon, PackagePlus, Plus, UserRoundPen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useLoadable } from '../use-loadable';
import { useHome } from './home-context';
import { SectionError } from './section-error';

const CARD = 'flex h-full flex-col gap-4 rounded-xl bg-surface p-4 shadow-card';
/** Nút của thẻ: cao 44, chữ được xuống dòng thay vì tràn (tiếng Anh dài hơn ~30%). */
const CARD_BUTTON = 'min-h-11 whitespace-normal px-3 text-center leading-tight';

export function PersonalCard({ className }: { className?: string }) {
  const { viewer, retryProfile } = useHome();
  if (viewer.status === 'loading') return <PersonalCardSkeleton className={className} />;
  if (viewer.status === 'guest') return <GuestCard className={className} />;
  if (!viewer.profile) return <SectionError onRetry={retryProfile} className={className} />;
  if (needsOnboarding(viewer.profile)) return <OnboardingCard className={className} />;
  return <StatsCard userId={viewer.id} className={className} />;
}

function PersonalCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(CARD, className)} aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-auto h-11 w-full sm:w-40" />
    </div>
  );
}

function IntroCard({
  Icon,
  title,
  body,
  action,
  className,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  action: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, className)}>
      {/* Desktop: thẻ cao bằng banner bên cạnh → nội dung đứng giữa, nút ở đáy. */}
      <div className="flex items-start gap-3 lg:flex-1 lg:items-center">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <Icon strokeWidth={1.75} className="size-7" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-md font-semibold text-fg">{title}</h2>
          <p className="text-sm text-muted">{body}</p>
        </div>
      </div>
      <div className="mt-auto flex">{action}</div>
    </section>
  );
}

function GuestCard({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <IntroCard
      className={className}
      Icon={LogIn}
      title={t('common.home.card.guest_title')}
      body={t('common.home.card.guest_body')}
      action={
        <LoginDialog
          trigger={
            <Button type="button" className={cn(CARD_BUTTON, 'w-full sm:w-auto sm:px-6')}>
              {t('auth.sign_in')}
            </Button>
          }
        />
      }
    />
  );
}

function OnboardingCard({ className }: { className?: string }) {
  const t = useTranslations('common.home.card');
  return (
    <IntroCard
      className={className}
      Icon={UserRoundPen}
      title={t('onboarding_title')}
      body={t('onboarding_body')}
      action={
        <LoginDialog
          trigger={
            <Button type="button" className={cn(CARD_BUTTON, 'w-full sm:w-auto sm:px-6')}>
              {t('onboarding_cta')}
            </Button>
          }
        />
      }
    />
  );
}

function PostButton({ className }: { className?: string }) {
  const t = useTranslations('common.actions');
  return (
    <Button asChild variant="accent" className={cn(CARD_BUTTON, className)}>
      <Link href="/dang-tin">
        <Plus aria-hidden strokeWidth={2} />
        {t('post')}
      </Link>
    </Button>
  );
}

function StatsCard({ userId, className }: { userId: string; className?: string }) {
  const t = useTranslations('common.home.card');
  const load = useCallback(() => getMyListingStats(createBrowserClient()), []);
  const [state, retry] = useLoadable(`stats:${userId}`, load);

  if (state.status === 'loading' || state.status === 'idle') return <PersonalCardSkeleton className={className} />;
  if (state.status === 'error') return <SectionError onRetry={retry} className={className} />;

  const s = state.data;
  if (s.active + s.pending + s.rejected + s.drafts === 0) {
    return (
      <IntroCard
        className={className}
        Icon={PackagePlus}
        title={t('first_post_title')}
        body={t('first_post_body')}
        action={<PostButton className="w-full sm:w-auto sm:px-6" />}
      />
    );
  }
  return <MineCard stats={s} className={className} />;
}

function MineCard({ stats, className }: { stats: MyListingStats; className?: string }) {
  const t = useTranslations('common.home.card');
  const locale = asLocale(useLocale());
  const columns = [
    { key: 'active', value: stats.active, warn: false },
    { key: 'pending', value: stats.pending, warn: stats.pending > 0 },
    { key: 'views', value: stats.total_views, warn: false },
  ] as const;

  return (
    <section className={cn(CARD, 'gap-3', className)}>
      <h2 className="text-md font-semibold text-fg">{t('mine_title')}</h2>
      {/* Desktop: thẻ cao bằng banner bên cạnh → khối số đứng giữa thay vì dồn lên trên. */}
      <div className="flex flex-col gap-3 lg:flex-1 lg:justify-center">
        <dl className="grid grid-cols-3">
          {columns.map((c, i) => (
            <div key={c.key} className={cn('flex min-w-0 flex-col-reverse items-center gap-0.5 px-2 text-center', i > 0 && 'border-l border-border')}>
              <dt className="text-sm text-muted">{t(c.key)}</dt>
              <dd className={cn('text-2xl font-bold', c.warn ? 'text-warning' : 'text-fg')}>{formatNumber(c.value, locale)}</dd>
            </div>
          ))}
        </dl>
        {stats.expiring_soon > 0 ? (
          <AlertRow
            href={{ pathname: '/toi/tin-cua-toi', query: { tab: 'active' } }}
            Icon={Clock}
            tone="warning"
            text={t('expiring', { count: stats.expiring_soon })}
          />
        ) : null}
        {stats.rejected > 0 ? (
          <AlertRow
            href={{ pathname: '/toi/tin-cua-toi', query: { tab: 'pending' } }}
            Icon={CircleAlert}
            tone="danger"
            text={t('rejected', { count: stats.rejected })}
          />
        ) : null}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
        <PostButton />
        <Button asChild variant="outline" className={CARD_BUTTON}>
          <Link href="/toi/tin-cua-toi">{t('manage')}</Link>
        </Button>
      </div>
    </section>
  );
}

function AlertRow({
  href,
  Icon,
  tone,
  text,
}: {
  href: { pathname: string; query: Record<string, string> };
  Icon: LucideIcon;
  tone: 'warning' | 'danger';
  text: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        tone === 'warning' ? 'bg-warning/10 hover:bg-warning/15' : 'bg-danger/10 hover:bg-danger/15',
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} className={cn('size-4 shrink-0', tone === 'warning' ? 'text-warning' : 'text-danger')} />
      <span className="min-w-0 flex-1">{text}</span>
      <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
    </Link>
  );
}
