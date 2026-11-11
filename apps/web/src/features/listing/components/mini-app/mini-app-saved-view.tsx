'use client';

// "Tin đã lưu" của mini-app (/pass-do/da-luu — Stitch saved). Dữ liệu riêng người dùng → đọc ở trình duyệt bằng hook chung
// @hp/core/react: useSavedListings (lọc tại chỗ theo danh mục của tính năng) + useBookmarkedListingIds (bỏ lưu → thẻ biến
// mất ngay, optimistic của useToggleBookmark; lỗi → thẻ trở lại + toast). Khung tĩnh render skeleton (ClientOnly).
// Chip tại chỗ: Tất cả · Đang bán · Ngừng bán (đã bán / đã đóng / hết hạn) kèm số. Thẻ ngang: ảnh vuông + nhãn danh mục nổi
// │ tiêu đề 2 dòng + tim (bỏ lưu) │ giá │ khu · thời gian đăng │ nhãn "Công nhân đã xác minh" khi chủ tin có huy hiệu worker;
// dải dưới: "Chat ngay" (mở / lấy lại hội thoại → /tin-nhan/[id]; ẩn với tin của mình). Tin ngừng bán: viền đứt, ảnh xám +
// nhãn trạng thái đè, chữ muted, dải dưới "Món này đã có người chốt" + "Tìm món tương tự" (→ trang chủ mini-app ?category=).
// Cuối trang: mẹo mua đồ an toàn. Khách (phiên hết hạn giữa chừng — proxy đã chặn) → SignInPrompt.
// Khác Stitch (cố ý): không nhắc "đã hạ giá / thợ khác hẹn xem", chip "Đã giảm giá", nhãn "-200K", giá gạch, "Giảm giá 12
// phút trước", "Trả giá" / "Gọi Zalo", ghi chú hẹn xem, nút "Tạo chuông" — chưa có dữ liệu / tính năng.
import type { PublicListing } from '@hp/core';
import { useBookmarkedListingIds, useSavedListings, useSession, useToggleBookmark } from '@hp/core/react';
import { formatNumber, formatRelative, type ListingFeature, priceLabel } from '@hp/shared';
import { BadgeCheck, ChevronRight, Heart, MapPin, MessageCircle, SearchX } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ClientOnly } from '@/components/shared/client-only';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SignInPrompt } from '@/components/shared/sign-in-prompt';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useOpenConversation } from '@/features/chat/use-chat';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { asLocale, priceText } from '../../display';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import { filterQuery } from '../../filters';
import { ListingPlaceholder } from '../listing-placeholder';
import { SafetyTip } from '../safety-tip';

type SavedTab = 'all' | 'active' | 'inactive';
const TABS: readonly SavedTab[] = ['all', 'active', 'inactive'];

const isOnSale = (l: PublicListing) => l.status === 'active' && !l.is_expired;

const CARD = 'flex flex-col overflow-hidden rounded-lg border bg-surface shadow-card';
const THUMB = 'relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:size-28';

export function MiniAppSavedView({ feature }: { feature: ListingFeature }) {
  return (
    <ClientOnly fallback={<SavedSkeleton />}>
      <SavedBody feature={feature} />
    </ClientOnly>
  );
}

function SavedBody({ feature }: { feature: ListingFeature }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const session = useSession();
  const enabled = !!session.userId;
  const saved = useSavedListings({ enabled });
  const ids = useBookmarkedListingIds({ enabled });
  const [tab, setTab] = useState<SavedTab>('all');

  if (session.isLoading || (enabled && saved.isPending)) return <SavedSkeleton />;
  if (!session.userId) return <SignInPrompt />;
  if (saved.isError && !saved.data) return <ErrorState code={saved.error.code} onRetry={() => void saved.refetch()} />;

  // Danh mục của tính năng + bỏ ngay thẻ vừa bỏ lưu (optimistic qua danh sách id).
  const mine = (saved.data ?? []).filter((l) => cfg.categories.includes(l.category) && (ids.data ? ids.data.has(l.id) : true));
  const counts: Record<SavedTab, number> = {
    all: mine.length,
    active: mine.filter(isOnSale).length,
    inactive: mine.filter((l) => !isOnSale(l)).length,
  };
  const visible = tab === 'all' ? mine : mine.filter((l) => (tab === 'active' ? isOnSale(l) : !isOnSale(l)));
  const now = saved.dataUpdatedAt;
  const tip = <SafetyTip title={t('listing.mini_app.saved.tip_title')} text={t('listing.mini_app.saved.tip_body')} />;

  if (mine.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={Heart}
          title={t('listing.mini_app.saved.empty_title')}
          description={t('listing.mini_app.saved.empty_body')}
          action={
            <Button asChild>
              <Link href={cfg.path}>{t('listing.mini_app.saved.empty_cta')}</Link>
            </Button>
          }
        />
        {tip}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t('listing.mini_app.saved.title')} className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 py-0.5">
          {TABS.map((key) => {
            const selected = key === tab;
            return (
              <li key={key} className="flex">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTab(key)}
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {t(`listing.mini_app.saved.tab_${key}`, { count: formatNumber(counts[key], locale) })}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t('listing.list.empty_search_title')}
          action={
            <Button type="button" variant="outline" onClick={() => setTab('all')}>
              {t('listing.mini_app.saved.tab_all', { count: formatNumber(counts.all, locale) })}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map((l) => (
            <li key={l.id} className="flex flex-col *:flex-1">
              <SavedRow listing={l} now={now} viewerId={session.userId} featurePath={cfg.path} />
            </li>
          ))}
        </ul>
      )}
      {tip}
    </div>
  );
}

function SavedRow({
  listing: l,
  now,
  viewerId,
  featurePath,
}: {
  listing: PublicListing;
  now: number;
  viewerId: string | null;
  /** Trang chủ mini-app ("Tìm món tương tự" → ?category=). */
  featurePath: string;
}) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const onSale = isOnSale(l);
  const cover = l.images[0];
  const price = priceText(priceLabel(l), t, locale);
  const statusLabel =
    l.status === 'sold'
      ? t('listing.mini_app.saved.sold_badge')
      : t(`common.status.${l.is_expired && l.status === 'active' ? 'expired' : l.status}`);
  const worker = l.owner_badges.includes('worker');

  return (
    <article className={cn(CARD, onSale ? 'border-border' : 'border-dashed border-border')}>
      <div className="flex gap-3 p-3">
        <div className={THUMB}>
          {cover ? (
            <Image
              src={listingImageUrl(cover, 'thumb')}
              alt=""
              fill
              unoptimized
              sizes="112px"
              className={cn('object-cover', !onSale && 'opacity-60 grayscale')}
            />
          ) : (
            <div className={cn('size-full', !onSale && 'opacity-60')}>
              <ListingPlaceholder category={l.category} size="sm" />
            </div>
          )}
          {onSale ? (
            <span className="absolute bottom-1.5 left-1.5 max-w-full truncate rounded-sm bg-surface/90 px-2 py-0.5 text-xs font-semibold text-fg shadow-card backdrop-blur-sm">
              {t(`listing.category_short.${l.category}`)}
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-fg/40">
              <span className="rounded-sm bg-surface/95 px-2 py-0.5 text-xs font-bold text-fg uppercase">{statusLabel}</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-1">
            <h3 lang={l.lang} className={cn('line-clamp-2 flex-1 pt-0.5 text-md leading-snug font-semibold', onSale ? 'text-fg' : 'text-muted')}>
              <Link href={`/tin/${l.slug}`} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                {l.title}
              </Link>
            </h3>
            <UnsaveButton listingId={l.id} title={l.title} />
          </div>
          {price ? <p className={cn('text-lg font-bold', onSale ? 'text-primary' : 'text-muted')}>{price}</p> : null}
          <p className="flex min-w-0 items-center gap-1 text-sm text-muted">
            {l.site_name ? <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" /> : null}
            <span className="line-clamp-1 min-w-0">
              {l.site_name ? `${l.site_name} · ` : null}
              <time dateTime={l.created_at}>{formatRelative(l.created_at, locale, new Date(now))}</time>
            </span>
          </p>
          {worker && t.has('listing.owner_badge.worker') ? (
            <span className="inline-flex items-center gap-1 self-start rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
              <BadgeCheck aria-hidden strokeWidth={1.75} className="size-3.5" />
              {t('listing.owner_badge.worker')}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-border bg-surface-2 px-3 py-2">
        {onSale ? (
          <>
            <span className="flex-1" />
            {viewerId && viewerId === l.owner_id ? null : <ChatButton listingId={l.id} />}
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-sm text-muted">{t('listing.mini_app.saved.inactive_hint')}</p>
            <Link
              href={{ pathname: featurePath, query: filterQuery({ category: l.category }) }}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t('listing.mini_app.saved.find_similar')}
              <ChevronRight aria-hidden strokeWidth={1.75} className="size-4" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

function UnsaveButton({ listingId, title }: { listingId: string; title: string }) {
  const t = useTranslations();
  const toast = useToast();
  const errorText = useErrorText();
  const toggle = useToggleBookmark();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t('listing.mini_app.saved.remove_a11y', { title })}
      className="-mt-1.5 -mr-1.5 shrink-0 rounded-full"
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(
          { listingId, next: false },
          {
            onSuccess: () => toast.show(t('listing.bookmark.removed')),
            onError: (e) => toast.show(errorText(e.code), 'error'),
          },
        )
      }
    >
      <Heart strokeWidth={1.75} className="fill-current text-danger" />
    </Button>
  );
}

function ChatButton({ listingId }: { listingId: string }) {
  const t = useTranslations();
  const { open, isPending } = useOpenConversation();
  return (
    <Button type="button" size="sm" disabled={isPending} onClick={() => open(listingId)} className="font-semibold">
      <MessageCircle aria-hidden strokeWidth={1.75} />
      {t('listing.mini_app.saved.chat')}
    </Button>
  );
}

function SavedSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className={cn(CARD, 'border-border')}>
            <div className="flex gap-3 p-3">
              <Skeleton className={cn(THUMB, 'bg-surface-2')} />
              <div className="flex flex-1 flex-col gap-2 pt-0.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="flex justify-end border-t border-border px-3 py-2">
              <Skeleton className="h-11 w-28" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
