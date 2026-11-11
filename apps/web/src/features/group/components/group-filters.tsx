// Bộ lọc danh sách nhóm — chạy được khi tắt JS: chip là link (?sub=, ?when=, ?full=1), ô tìm là form GET (giữ các lọc khác
// bằng input ẩn). Style Stitch (khớp GroupBrowser của app):
//   GroupSearchForm — ô tìm nổi bo tròn trong header xanh (như ListSearchForm của trang tin) + nút Tìm.
//   GroupChips — một hàng chip cuộn ngang dưới header: [Xoá tìm ×] (khi có từ khoá) · khoảng giờ (Mọi ngày / Hôm nay / Ngày
//   mai / 7 ngày tới) · "Hiện cả nhóm đã đủ người" · vạch ngăn · loại con (Tất cả / Xe cá nhân / Xe khách gom / Xe máy chở
//   kèm; kèo: Bóng đá / Cầu lông / Pickleball). Hai nhóm chip là hai <nav> có nhãn riêng cho trình đọc màn hình.
// Không bản đồ ở web (chưa có key Goong); không lọc "điểm đón / ca / loại xe 4–7 chỗ" như Stitch (không có dữ liệu đó).
import { GROUP_TIME_WINDOWS } from '@hp/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { GroupFeatureConfig } from '../feature-config';
import { type GroupFilterState, groupFilterQuery } from '../filters';

const RING = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

function Chip({ href, selected, children }: { href: Parameters<typeof Link>[0]['href']; selected: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-md font-medium whitespace-nowrap transition-colors',
        RING,
        selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg shadow-card hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  );
}

export function GroupSearchForm({
  config,
  action,
  filters,
}: {
  config: GroupFeatureConfig;
  /** Đường dẫn đã có tiền tố ngôn ngữ cho form GET. */
  action: string;
  filters: GroupFilterState;
}) {
  const t = useTranslations();
  const placeholder = t(`group.list.search_placeholder_${config.kind}`);
  return (
    <form action={action} role="search" className="flex gap-2">
      {Object.entries(groupFilterQuery({ ...filters, query: '' })).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder={placeholder}
          maxLength={100}
          className="rounded-full border-transparent pl-11 shadow-card focus-visible:ring-on-primary/60"
        />
      </label>
      <Button type="submit" size="lg" variant="outline" className="shrink-0 border-transparent font-semibold text-primary shadow-card">
        {t('listing.list.search_submit')}
      </Button>
    </form>
  );
}

export function GroupChips({ config, filters }: { config: GroupFeatureConfig; filters: GroupFilterState }) {
  const t = useTranslations();
  const { path } = config;
  const href = (patch: Partial<GroupFilterState>) => ({ pathname: path, query: groupFilterQuery({ ...filters, ...patch }) });

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {filters.query ? (
        <Chip href={href({ query: '' })} selected={false}>
          {t('listing.list.clear_search')}
          <X strokeWidth={1.75} aria-hidden className="size-4" />
        </Chip>
      ) : null}
      <nav aria-label={t('web.group.when_label')} className="shrink-0">
        <ul className="flex gap-2">
          <li>
            <Chip href={href({ when: null })} selected={!filters.when}>
              {t('group.list.when_any')}
            </Chip>
          </li>
          {GROUP_TIME_WINDOWS.map((w) => (
            <li key={w}>
              <Chip href={href({ when: w })} selected={filters.when === w}>
                {t(`group.list.when.${w}`)}
              </Chip>
            </li>
          ))}
          <li>
            <Chip href={href({ includeFull: !filters.includeFull })} selected={filters.includeFull}>
              {t('group.list.include_full')}
            </Chip>
          </li>
        </ul>
      </nav>
      <span aria-hidden className="my-2 w-px shrink-0 bg-border" />
      <nav aria-label={t('web.group.sub_kinds_label')} className="shrink-0">
        <ul className="flex gap-2">
          <li>
            <Chip href={href({ sub: null })} selected={!filters.sub}>
              {t('group.list.sub_any')}
            </Chip>
          </li>
          {config.subKinds.map((s) => (
            <li key={s}>
              <Chip href={href({ sub: s })} selected={filters.sub === s}>
                {t(`group.sub_kind.${s}`)}
              </Chip>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
