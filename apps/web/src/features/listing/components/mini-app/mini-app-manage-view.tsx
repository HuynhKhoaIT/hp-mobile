'use client';

// "Quản lý tin đăng" của mini-app (/pass-do/quan-ly?tab=active|sold|pending|hidden — Stitch manage). Dữ liệu riêng → đọc ở
// trình duyệt bằng hook chung @hp/core/react (khung tĩnh render skeleton — ClientOnly):
//   thẻ hồ sơ (useMyProfile: ảnh, tên, huy hiệu, đánh giá) + 3 số liệu (useFeatureListingsSummary: tin hiển thị · đã thanh lý
//   · lượt xem) + mẹo giờ đăng → tab có số (link ?tab= — chạy cả khi tắt JS; Chờ duyệt gồm bị từ chối, Đã ẩn gồm rút tin /
//   hết hạn / nháp) → ô tìm (lọc tại chỗ trên các tin đã tải: tiêu đề, mã tin) + sắp xếp (Mới nhất / Nhiều lượt xem — tại chỗ)
//   → thẻ tin (useFeatureListings, "Xem thêm" trang sau).
// Thẻ: ảnh + nhãn danh mục │ tiêu đề + menu ⋮ (MyListingMenu dùng chung "Tin của tôi": sửa / đã bán / rút tin / mở lại /
// gửi duyệt lại / gia hạn / xoá có xác nhận) │ giá │ khu · thời gian │ dải số liệu (lượt xem, nhãn trạng thái, hết hạn) │
// ghi chú chờ duyệt / bị từ chối + lý do │ hàng nút theo trạng thái: đang bán → (Gia hạn) · Đã bán · Sửa tin · Chia sẻ; đã bán
// → Đăng lại · Chia sẻ; bị từ chối → Gửi duyệt lại · Sửa tin; chờ duyệt / nháp → Sửa tin; hết hạn → Gia hạn · Sửa tin; đã ẩn →
// Đăng lại · Sửa tin. Thao tác gọi đúng Server Action của "Tin của tôi" (useManage — manage.ts quyết định nút nào hiện, RLS
// mới chặn); xong thì làm mới mọi query dưới keys.myListings() (gồm số liệu + danh sách mini-app).
// Khác Stitch (cố ý): không "Phản hồi chat 98%", số chat / gọi, "Đẩy tin" / "Đã đẩy tin" / "Đang ưu tiên trang 1", "Gửi nhóm
// Zalo", "Sửa giá" riêng, khối tiện ích (đẩy tin ca kíp, in mã QR), dòng "Đã xác minh thẻ nhà máy Hòa Phát", nút hỗ trợ /
// hoá đơn trên header — chưa có dữ liệu / tính năng.
import { FEATURE_LISTINGS_TABS, type FeatureListingsTab, type MyListing } from '@hp/core';
import { useFeatureListings, useFeatureListingsSummary, useMyProfile, useSession, useSites } from '@hp/core/react';
import { formatDate, formatNumber, formatRelative, type ListingFeature, type ListingStatus, priceLabel } from '@hp/shared';
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock,
  Eye,
  FileText,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Share2,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { Badge } from '@/components/shared/badge';
import { ClientOnly } from '@/components/shared/client-only';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SignInPrompt } from '@/components/shared/sign-in-prompt';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { asLocale, priceText } from '../../display';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import { hasPublicPage, isInactive, manageActions, ownerStatus, STATUS_TONE } from '../../manage';
import { useShareListing } from '../../use-share-listing';
import { ListingPlaceholder } from '../listing-placeholder';
import { MyListingMenu, useManage } from '../my-listing-menu';

const CARD = 'flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-card';
const THUMB = 'relative size-22 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2 sm:size-24';

/** Nhãn trạng thái trên thẻ (tin đang bán không cần nhãn). */
const STATUS_KEY: Partial<Record<ListingStatus, string>> = {
  draft: 'listing.mini_app.manage.draft_badge',
  rejected: 'listing.mini_app.manage.rejected_badge',
  pending_review: 'listing.mini_app.manage.pending_badge',
  expired: 'listing.mini_app.manage.expired_badge',
  closed: 'listing.mini_app.manage.closed_badge',
  sold: 'common.status.sold',
};

// ── Số tin đang bán cạnh tiêu đề header ───────────────────────────────────────────────────────────────────────

export function MiniAppManageCount({ feature }: { feature: ListingFeature }) {
  return (
    <ClientOnly fallback={null}>
      <ManageCount feature={feature} />
    </ClientOnly>
  );
}

function ManageCount({ feature }: { feature: ListingFeature }) {
  const t = useTranslations('listing.mini_app.manage');
  const session = useSession();
  const summary = useFeatureListingsSummary(LISTING_FEATURE_CONFIGS[feature].categories, { enabled: !!session.userId });
  if (!summary.data) return null;
  return (
    <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent">
      {t('active_count', { count: summary.data.active })}
    </span>
  );
}

// ── Trang ───────────────────────────────────────────────────────────────────────────────────────────────────

/** `tab = null`: chưa đọc searchParams (fallback của <Suspense>) → chỉ skeleton. */
export function MiniAppManageView({ feature, tab }: { feature: ListingFeature; tab: FeatureListingsTab | null }) {
  if (!tab) return <ManageSkeleton />;
  return (
    <ClientOnly fallback={<ManageSkeleton />}>
      <ManageBody feature={feature} tab={tab} />
    </ClientOnly>
  );
}

function ManageBody({ feature, tab }: { feature: ListingFeature; tab: FeatureListingsTab }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const managePath = cfg.miniApp?.paths.manage ?? '/toi/tin-cua-toi';
  const session = useSession();
  const enabled = !!session.userId;
  const summary = useFeatureListingsSummary(cfg.categories, { enabled });
  const list = useFeatureListings(cfg.categories, tab, { enabled });
  const sites = useSites();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'views'>('newest');
  const searchId = useId();

  if (session.isLoading) return <ManageSkeleton />;
  if (!session.userId) return <SignInPrompt description={t('listing.mini_app.manage.signed_out_body')} />;

  const siteName = (code: string | null) => (code ? sites.data?.find((s) => s.code === code)?.name : undefined);
  const q = query.trim().toLocaleLowerCase();
  const rows = list.items
    .filter((l) => !q || l.title.toLocaleLowerCase().includes(q) || l.short_id.toLocaleLowerCase().includes(q))
    .sort((a, b) => (sort === 'views' ? b.view_count - a.view_count : 0));

  return (
    <div className="flex flex-col gap-4">
      <ProfileCard feature={feature} />

      <nav aria-label={t('listing.mini_app.manage.title')} className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1 rounded-lg border border-border bg-surface p-1 shadow-card">
          {FEATURE_LISTINGS_TABS.map((key) => {
            const selected = key === tab;
            const count = summary.data?.[key];
            return (
              <li key={key} className="flex flex-1">
                <Link
                  href={{ pathname: managePath, query: { tab: key } }}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected ? 'bg-primary text-on-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {t(`listing.mini_app.manage.tab_${key}`)}
                  {count !== undefined ? (
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                        selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg',
                      )}
                    >
                      {formatNumber(count, locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            {t('listing.mini_app.manage.search_placeholder')}
          </label>
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={t('listing.mini_app.manage.search_placeholder')}
            maxLength={100}
            className="rounded-full pl-11"
          />
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {list.isPending ? (
        <ManageRowsSkeleton />
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t(`listing.mini_app.manage.empty_${tab}_title`)}
          description={t(`listing.mini_app.manage.empty_${tab}_body`)}
          action={
            tab === 'active' ? (
              <Button asChild variant="accent" className="font-semibold">
                <Link href={{ pathname: '/dang-tin', query: { feature } }}>
                  <Plus aria-hidden strokeWidth={2} />
                  {t('listing.list.post_cta')}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('listing.list.empty_search_title')}
          action={
            <Button type="button" variant="outline" onClick={() => setQuery('')}>
              {t('listing.list.clear_search')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((l) => (
              <li key={l.id} className="flex flex-col *:flex-1">
                <ManageRow listing={l} now={list.dataUpdatedAt} siteName={siteName(l.site)} />
              </li>
            ))}
          </ul>
          {list.isError ? <ErrorState code={list.error.code} onRetry={() => void list.fetchNextPage()} /> : null}
          {list.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="lg" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {list.isFetchingNextPage ? t('listing.list.loading_more') : t('listing.list.load_more')}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SortSelect({ value, onChange }: { value: 'newest' | 'views'; onChange: (v: 'newest' | 'views') => void }) {
  const t = useTranslations();
  const id = useId();
  return (
    <div className="relative sm:w-56">
      <label htmlFor={id} className="sr-only">
        {t('listing.sort.label')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value === 'views' ? 'views' : 'newest')}
        className="min-h-12 w-full appearance-none rounded-full border border-border bg-surface pr-10 pl-4 text-md font-medium text-fg outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <option value="newest">{t('listing.sort.newest')}</option>
        <option value="views">{t('listing.mini_app.manage.sort_views')}</option>
      </select>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
        <Eye strokeWidth={1.75} className="size-5" />
      </span>
    </div>
  );
}

/** Thẻ hồ sơ + 3 số liệu + mẹo (Stitch). */
function ProfileCard({ feature }: { feature: ListingFeature }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const profile = useMyProfile();
  const summary = useFeatureListingsSummary(cfg.categories, { enabled: !!profile.userId });
  const p = profile.data;
  const name = p?.full_name?.trim() || '';
  const badges = (p?.badges ?? []).filter((b) => t.has(`listing.owner_badge.${b}`));
  const rated = !!p && p.rating_count > 0;

  const stats: { key: string; label: string; value: number | undefined; tone: string }[] = [
    { key: 'active', label: t('listing.mini_app.manage.stat_active'), value: summary.data?.active, tone: 'text-primary' },
    { key: 'sold', label: t('listing.mini_app.manage.stat_sold'), value: summary.data?.sold, tone: 'text-service-pass' },
    { key: 'views', label: t('listing.mini_app.manage.stat_views'), value: summary.data?.views, tone: 'text-primary' },
  ];

  return (
    <section aria-label={name || t('common.profile.title')} className={cn(CARD, 'gap-4 p-4')}>
      {profile.isLoading ? (
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ) : profile.isError ? (
        <InlineError code={profile.error.code} onRetry={() => void profile.refetch()} />
      ) : (
        <div className="flex items-center gap-3">
          <UserAvatar avatar={p?.avatar_url} name={name || '?'} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-lg font-bold text-fg">{name}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {badges.map((b) => (
                <Badge key={b} tone="primary">
                  {t(`listing.owner_badge.${b}`)}
                </Badge>
              ))}
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden strokeWidth={1.75} className={cn('size-4', rated ? 'fill-current text-warning' : 'text-muted')} />
                {rated && p
                  ? t('common.profile.rating', { avg: formatNumber(Math.round(p.rating_avg * 10) / 10, locale), count: p.rating_count })
                  : t('common.profile.no_rating')}
              </span>
            </div>
          </div>
        </div>
      )}

      {summary.isError ? (
        <InlineError code={summary.error.code} onRetry={() => void summary.refetch()} />
      ) : (
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.key} className="flex flex-col-reverse items-center gap-1 rounded-md bg-surface-2 px-2 py-3 text-center">
              <dt className="text-xs font-medium text-muted sm:text-sm">{s.label}</dt>
              <dd className={cn('text-2xl font-bold', s.tone)}>
                {s.value === undefined ? <Skeleton className="h-8 w-10" /> : formatNumber(s.value, locale)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-fg">
        <Lightbulb aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>{t('listing.mini_app.manage.tip')}</span>
      </p>
    </section>
  );
}

function InlineError({ code, onRetry }: { code: string; onRetry: () => void }) {
  const t = useTranslations();
  return (
    <div role="alert" className="flex items-center gap-3 rounded-md bg-surface-2 p-3 text-sm text-fg">
      <CircleAlert aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-danger" />
      <span className="min-w-0 flex-1">{t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.unknown')}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {t('common.actions.retry')}
      </Button>
    </div>
  );
}

type RowAction = { key: string; label: string; Icon: LucideIcon; tone: 'primary' | 'accent' | 'outline'; onClick?: () => void; href?: string };

function ManageRow({ listing: l, now, siteName }: { listing: MyListing; now: number; siteName: string | undefined }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const status = ownerStatus(l, now);
  const inactive = isInactive(status);
  const allowed = manageActions(l, now);
  const { pending, handlers, dialogs } = useManage(l.id);
  const share = useShareListing();
  const cover = l.images[0];
  const price = priceText(priceLabel(l), t, locale);
  const titleHref = hasPublicPage(status) ? `/tin/${l.slug}` : `/toi/tin-cua-toi/${l.id}/sua`;
  const editHref = `/toi/tin-cua-toi/${l.id}/sua`;
  const reasons = l.moderation_reasons.filter((r) => t.has(`listing.manage.reason.${r}`));
  const statusKey = STATUS_KEY[status];

  const out: RowAction[] = [];
  const edit: RowAction = { key: 'edit', label: t('listing.mini_app.manage.edit'), Icon: Pencil, tone: 'outline', href: editHref };
  const shareAction: RowAction = {
    key: 'share',
    label: t('listing.mini_app.manage.share'),
    Icon: Share2,
    tone: 'outline',
    onClick: () => void share({ slug: l.slug, title: l.title }),
  };
  const repost: RowAction = { key: 'reopen', label: t('listing.mini_app.manage.repost'), Icon: RotateCcw, tone: 'primary', onClick: handlers.reopen };
  const renew: RowAction = { key: 'renew', label: t('listing.mini_app.manage.renew'), Icon: CalendarClock, tone: 'accent', onClick: handlers.renew };
  switch (status) {
    case 'active':
      if (allowed.includes('renew')) out.push(renew);
      if (allowed.includes('sold')) {
        out.push({ key: 'sold', label: t('listing.mini_app.manage.mark_sold'), Icon: CircleCheck, tone: 'outline', onClick: handlers.sold });
      }
      out.push(edit, shareAction);
      break;
    case 'sold':
      if (allowed.includes('reopen')) out.push(repost);
      out.push(shareAction);
      break;
    case 'rejected':
      if (allowed.includes('resubmit')) {
        out.push({ key: 'resubmit', label: t('listing.manage.resubmit'), Icon: Send, tone: 'primary', onClick: handlers.resubmit });
      }
      out.push(edit);
      break;
    case 'expired':
      if (allowed.includes('renew')) out.push(renew);
      out.push(edit);
      break;
    case 'closed':
      if (allowed.includes('reopen')) out.push(repost);
      out.push(edit);
      break;
    default:
      out.push({ ...edit, tone: 'primary' });
  }

  return (
    <article className={cn(CARD, inactive && 'border-dashed')}>
      <div className="flex gap-3">
        <div className={THUMB}>
          {cover ? (
            <Image
              src={listingImageUrl(cover, 'thumb')}
              alt=""
              fill
              unoptimized
              sizes="96px"
              className={cn('object-cover', inactive && 'opacity-80 saturate-50')}
            />
          ) : (
            <ListingPlaceholder category={l.category} size="sm" />
          )}
          <span className="absolute top-1.5 left-1.5 max-w-full truncate rounded-sm bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-card backdrop-blur-sm">
            {t(`listing.category_short.${l.category}`)}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-1">
            <h3 lang={l.lang} className={cn('line-clamp-2 flex-1 pt-0.5 text-md leading-snug font-semibold', inactive ? 'text-muted' : 'text-fg')}>
              <Link href={titleHref} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                {l.title}
              </Link>
            </h3>
            <MyListingMenu id={l.id} title={l.title} actions={allowed} className="-mt-1.5 -mr-1.5" />
          </div>
          {price ? <p className={cn('text-lg font-bold', inactive ? 'text-muted' : 'text-primary')}>{price}</p> : null}
          <p className="mt-auto flex min-w-0 items-center gap-1 text-sm text-muted">
            {siteName ? <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" /> : null}
            <span className="line-clamp-1 min-w-0">
              {siteName ? `${siteName} · ` : null}
              <time dateTime={l.created_at}>{formatRelative(l.created_at, locale, new Date(now))}</time>
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye aria-hidden strokeWidth={1.75} className="size-4" />
          {t('listing.mini_app.manage.views', { count: l.view_count })}
        </span>
        {status === 'active' && l.expires_at ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden strokeWidth={1.75} className="size-4" />
            {t('listing.manage.expires_on', { date: formatDate(l.expires_at, locale) })}
          </span>
        ) : null}
        {statusKey ? (
          <Badge tone={STATUS_TONE[status]} className="ml-auto">
            {t(statusKey)}
          </Badge>
        ) : null}
      </div>

      {status === 'pending_review' || status === 'rejected' ? (
        <Note tone={status === 'rejected' ? 'danger' : 'warning'}>
          <p>{status === 'rejected' ? t('listing.manage.rejected_note') : t('listing.manage.pending_note')}</p>
          {reasons.length > 0 ? (
            <ul className="list-inside list-disc">
              {reasons.map((r) => (
                <li key={r}>{t(`listing.manage.reason.${r}`)}</li>
              ))}
            </ul>
          ) : null}
        </Note>
      ) : null}

      <div role="group" aria-label={l.title} className="flex flex-wrap gap-2">
        {out.map(({ key, label, Icon, tone, onClick, href }) => {
          const className = cn(
            'min-w-0 flex-1 font-semibold whitespace-normal leading-tight',
            tone === 'accent' && 'bg-accent text-on-accent hover:bg-accent/90',
          );
          const content = (
            <>
              <Icon aria-hidden strokeWidth={1.75} />
              {label}
            </>
          );
          const variant = tone === 'outline' ? 'outline' : tone === 'accent' ? 'accent' : 'default';
          return href ? (
            <Button key={key} asChild size="sm" variant={variant} className={className}>
              <Link href={href}>{content}</Link>
            </Button>
          ) : (
            <Button key={key} type="button" size="sm" variant={variant} disabled={pending} className={className} onClick={onClick}>
              {content}
            </Button>
          );
        })}
      </div>
      {dialogs}
    </article>
  );
}

function Note({ tone, children }: { tone: 'danger' | 'warning'; children: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-md px-3 py-2 text-sm text-fg', tone === 'danger' ? 'bg-danger/10' : 'bg-warning/10')}>
      {tone === 'danger' ? (
        <CircleAlert aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-danger" />
      ) : (
        <Clock aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </div>
  );
}

function ManageRowsSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className={CARD}>
          <div className="flex gap-3">
            <Skeleton className={cn(THUMB, 'border-0')} />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-auto h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ManageSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className={cn(CARD, 'gap-4 p-4')}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
      <Skeleton className="h-13 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-full" />
      <ManageRowsSkeleton />
    </div>
  );
}
