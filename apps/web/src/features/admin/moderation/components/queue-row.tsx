'use client';

// Một dòng hàng chờ: ô chọn (chỉ tab Chờ duyệt) | ảnh bìa | tiêu đề + rủi ro | danh mục · giá | lý do | người đăng · thời gian.
// Cả dòng là một nút chọn (mở panel chi tiết); ô chọn tách riêng để không lồng phần tử tương tác.
import type { ModerationItem } from '@hp/core';
import { formatRelative, type Locale, NEW_ACCOUNT_DAYS, priceLabel, riskLevel } from '@hp/shared';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';
import { Badge } from '@/components/shared/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { priceText } from '@/features/listing/display';
import { ListingPlaceholder } from '@/features/listing/components/listing-placeholder';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { isOwnerBanned, REASON_TONE, RISK_TONE } from '../labels';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isNewAccount(createdAt: string, now: number): boolean {
  return now - new Date(createdAt).getTime() < NEW_ACCOUNT_DAYS * DAY_MS;
}

type Props = {
  item: ModerationItem;
  locale: Locale;
  now: number;
  selected: boolean;
  selectable: boolean;
  checked: boolean;
  onSelect: () => void;
  onCheckedChange: (checked: boolean) => void;
  ref?: Ref<HTMLLIElement>;
};

export function QueueRow({ item, locale, now, selected, selectable, checked, onSelect, onCheckedChange, ref }: Props) {
  const t = useTranslations();
  const { listing, owner } = item;
  const cover = listing.images[0];
  const level = riskLevel(item.risk_score);
  const nowDate = new Date(now);

  return (
    <li ref={ref} className="relative">
      <div
        className={cn(
          'flex items-stretch gap-3 rounded-md border bg-surface p-3 transition-colors duration-150',
          selected ? 'border-primary bg-primary-light/40 ring-1 ring-primary' : 'border-border hover:border-primary/40',
        )}
      >
        {selectable ? (
          <div className="flex items-start pt-1">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => onCheckedChange(v === true)}
              aria-label={t('admin.moderation.select_item', { title: listing.title })}
            />
          </div>
        ) : null}
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? 'true' : undefined}
          className="flex min-w-0 flex-1 gap-3 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="relative aspect-avatar w-16 shrink-0 self-start sm:w-20 overflow-hidden rounded-sm bg-surface-2">
            {cover ? (
              <Image src={listingImageUrl(cover, 'thumb')} alt="" fill unoptimized sizes="80px" className="object-cover" />
            ) : (
              <ListingPlaceholder category={listing.category} size="sm" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-2">
              <p lang={listing.lang} className="line-clamp-2 flex-1 text-md font-semibold text-fg">
                {listing.title}
              </p>
              <Badge tone={RISK_TONE[level]} className="shrink-0">
                <span title={t(`admin.moderation.risk_level.${level}`)}>{t('admin.moderation.risk', { score: item.risk_score })}</span>
              </Badge>
            </div>
            <p className="truncate text-sm text-muted">
              {t(`common.category.${listing.category}`)} · <span className="font-semibold text-fg">{priceText(priceLabel(listing), t, locale)}</span>
            </p>
            {item.reasons.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {item.reasons.map((r) => (
                  <li key={r}>
                    <Badge tone={REASON_TONE[r]} className="px-2 py-0.5">
                      {t(`listing.manage.reason.${r}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
              <span className="font-medium text-fg">
                {owner?.deleted
                  ? t('admin.moderation.deleted_owner')
                  : (owner?.display_name ?? t('admin.moderation.unknown_owner'))}
              </span>
              {owner && !owner.deleted ? (
                <>
                  <span aria-hidden>·</span>
                  <span className={cn(isNewAccount(owner.created_at, now) && 'font-medium text-fg')}>
                    {t('admin.moderation.owner_joined', { time: formatRelative(owner.created_at, locale, nowDate) })}
                  </span>
                </>
              ) : null}
              {owner && isOwnerBanned(owner, now) ? (
                <Badge tone="danger" className="px-2 py-0.5">
                  {t('admin.moderation.banned')}
                </Badge>
              ) : null}
            </p>
            <p className="text-sm text-muted">
              <time dateTime={item.status === 'pending' ? item.created_at : (item.reviewed_at ?? item.updated_at)}>
                {item.status === 'pending'
                  ? t('admin.moderation.posted', { time: formatRelative(item.created_at, locale, nowDate) })
                  : item.reviewed_by
                    ? t('admin.moderation.reviewed_by', {
                        name: item.reviewer_name ?? t('admin.moderation.detail.history_system'),
                        time: formatRelative(item.reviewed_at ?? item.updated_at, locale, nowDate),
                      })
                    : t('admin.moderation.auto_rejected', { time: formatRelative(item.updated_at, locale, nowDate) })}
              </time>
            </p>
          </div>
        </button>
      </div>
    </li>
  );
}
