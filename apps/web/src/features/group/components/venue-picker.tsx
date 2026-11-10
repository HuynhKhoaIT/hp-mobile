'use client';

// Chọn sân cho ghép trận (/tao-nhom/sport) — giống bước chọn sân của app (ns group.venue):
//   chưa chọn → ô tìm (theo tên / địa chỉ, chờ 300 ms sau khi gõ) + danh sách sân đã duyệt đúng môn, trong khu của hồ sơ
//               (useVenues → RPC search_venues; mỗi dòng: tên · địa chỉ · giá tham khảo / giờ) + "Sân khác (tự nhập)"
//   đã chọn   → thẻ sân + "Đổi sân"; form gửi venue_id + origin_text = tên sân
//   tự nhập   → ô chữ (venue_id = null) + "Chọn sân" để quay lại danh sách
// "Góp sân mới" luôn có (dialog ContributeVenueDialog — sân chờ duyệt, chưa chọn được ngay).
// Không hiện SĐT sân ở đây (chỉ cần khi gọi đặt sân, không phải lúc tạo kèo). Dữ liệu ở trình duyệt (@hp/core/react) →
// nơi gọi bọc trong <ClientOnly>. Loading: skeleton dòng; lỗi: thử lại; rỗng: gợi ý tự nhập / góp sân.
import type { Venue } from '@hp/core';
import { useVenues } from '@hp/core/react';
import { formatMoney, GROUP_RULES, type GroupSubKind, type Locale } from '@hp/shared';
import { Check, MapPin, PencilLine, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { ContributeVenueDialog } from './contribute-venue-dialog';

/** Sân đang chọn trong form (đủ để hiện thẻ + kiểm môn khi đổi loại con). */
export type PickedVenue = Pick<Venue, 'id' | 'name' | 'address_text' | 'price_ref' | 'sports'>;

export type VenueMode = 'catalog' | 'custom';

const SEARCH_DELAY_MS = 300;

/** Chữ tìm kiếm "đứng yên" sau `delay` ms — không gọi RPC mỗi phím gõ. */
function useSettled(value: string, delay: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}

function VenueText({ venue, locale }: { venue: PickedVenue; locale: Locale }) {
  const t = useTranslations('group.venue');
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
      <span className="truncate text-md font-medium text-fg">{venue.name}</span>
      {venue.address_text ? <span className="line-clamp-2 text-sm text-muted">{venue.address_text}</span> : null}
      {venue.price_ref != null && venue.price_ref > 0 ? (
        <span className="text-sm font-semibold text-fg">{t('price_ref', { price: formatMoney(venue.price_ref, locale) })}</span>
      ) : null}
    </span>
  );
}

export function VenuePicker({
  sport,
  site,
  locale,
  mode,
  venue,
  customText,
  error,
  disabled,
  onPick,
  onModeChange,
  onCustomTextChange,
}: {
  sport: GroupSubKind;
  /** Khu trong hồ sơ (sites.code) — null: mọi khu. */
  site: string | null;
  locale: Locale;
  mode: VenueMode;
  venue: PickedVenue | null;
  customText: string;
  /** Mã lỗi errors.* (origin_text / venue_id). */
  error: string | null;
  disabled: boolean;
  onPick: (venue: PickedVenue | null) => void;
  onModeChange: (mode: VenueMode) => void;
  onCustomTextChange: (text: string) => void;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const id = useId();
  const [contributeOpen, setContributeOpen] = useState(false);
  const errorId = `${id}-error`;

  const contribute = (
    <>
      <Button type="button" variant="ghost" disabled={disabled} onClick={() => setContributeOpen(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        {t('group.venue.contribute')}
      </Button>
      <ContributeVenueDialog open={contributeOpen} onOpenChange={setContributeOpen} defaultSport={sport} />
    </>
  );
  const errorLine = error ? (
    <p id={errorId} className="text-sm text-danger">
      {errorText(error)}
    </p>
  ) : null;

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-md font-medium text-fg">{t('group.form.venue_label')}</legend>

      {mode === 'custom' ? (
        <>
          <Input
            id={`${id}-custom`}
            aria-label={t('group.venue.other_place')}
            value={customText}
            maxLength={GROUP_RULES.placeMax}
            placeholder={t('group.form.venue_placeholder')}
            autoComplete="off"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => onCustomTextChange(e.target.value)}
          />
          {errorLine}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onModeChange('catalog')}>
              <Search strokeWidth={1.75} aria-hidden />
              {t('group.venue.pick_title')}
            </Button>
            {contribute}
          </div>
        </>
      ) : venue ? (
        <>
          <div className="flex items-start gap-3 rounded-md border border-primary bg-primary-light p-3">
            <Check strokeWidth={1.75} aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="sr-only">{t('group.venue.selected')}: </span>
            <VenueText venue={venue} locale={locale} />
          </div>
          {errorLine}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onPick(null)}>
              {t('group.venue.change')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <VenueSearch sport={sport} site={site} locale={locale} disabled={disabled} onPick={onPick} />
          {errorLine}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onModeChange('custom')}>
              <PencilLine strokeWidth={1.75} aria-hidden />
              {t('group.venue.other_place')}
            </Button>
            {contribute}
          </div>
        </>
      )}
    </fieldset>
  );
}

function VenueSearch({
  sport,
  site,
  locale,
  disabled,
  onPick,
}: {
  sport: GroupSubKind;
  site: string | null;
  locale: Locale;
  disabled: boolean;
  onPick: (venue: PickedVenue) => void;
}) {
  const t = useTranslations();
  const listId = useId();
  const [text, setText] = useState('');
  const query = useSettled(text.trim(), SEARCH_DELAY_MS);
  const venues = useVenues({ sport, site: site ?? undefined, query: query || undefined });

  let body;
  if (venues.isPending) {
    body = (
      <ul aria-hidden className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex flex-col gap-1 rounded-md border border-border p-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </li>
        ))}
      </ul>
    );
  } else if (venues.isError) {
    body = <ErrorState code={venues.error.code} onRetry={() => void venues.refetch()} />;
  } else if (venues.data.length === 0) {
    body = (
      <p role="status" className="rounded-md bg-surface-2 p-3 text-md text-muted">
        {t('group.venue.empty')}
      </p>
    );
  } else {
    body = (
      <ul id={listId} aria-label={t('group.venue.pick_title')} className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {venues.data.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(v)}
              className="flex min-h-11 w-full items-start gap-3 rounded-md border border-border bg-surface p-3 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <MapPin strokeWidth={1.75} aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
              <VenueText venue={v} locale={locale} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search strokeWidth={1.75} aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={text}
          aria-label={t('group.venue.search_placeholder')}
          aria-controls={venues.data?.length ? listId : undefined}
          placeholder={t('group.venue.search_placeholder')}
          autoComplete="off"
          disabled={disabled}
          className="pl-10"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div aria-live="polite" aria-busy={venues.isFetching || undefined}>
        {body}
      </div>
    </div>
  );
}
