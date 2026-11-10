// Bộ lọc danh sách nhóm — chạy được khi tắt JS: chip là link (?sub=, ?when=, ?full=1), ô tìm là form GET (giữ các lọc khác
// bằng input ẩn). Hai hàng chip: loại con (xe cá nhân / xe khách gom / xe máy; bóng đá / cầu lông / pickleball) và khoảng
// giờ (hôm nay / ngày mai / 7 ngày tới). Không bản đồ ở web tuần này (chưa có key Goong).
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

function Chip({ href, selected, children }: { href: Parameters<typeof Link>[0]['href']; selected: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 text-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  );
}

export function GroupFilters({
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
  const { path, kind } = config;
  const placeholder = t(`group.list.search_placeholder_${kind}`);
  const href = (patch: Partial<GroupFilterState>) => ({ pathname: path, query: groupFilterQuery({ ...filters, ...patch }) });

  return (
    <div className="flex flex-col gap-3">
      <form action={action} role="search" className="flex flex-col gap-2 sm:flex-row">
        {Object.entries(groupFilterQuery({ ...filters, query: '' })).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="relative block flex-1">
          <span className="sr-only">{placeholder}</span>
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
          />
          <Input name="q" type="search" defaultValue={filters.query} placeholder={placeholder} maxLength={100} className="pl-10" />
        </label>
        <Button type="submit" size="lg">
          {t('listing.list.search_submit')}
        </Button>
      </form>

      {filters.query ? (
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href={href({ query: '' })}>
              <X strokeWidth={1.75} aria-hidden />
              {t('listing.list.clear_search')}
            </Link>
          </Button>
        </div>
      ) : null}

      <nav aria-label={t('web.group.sub_kinds_label')} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
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

      <nav aria-label={t('web.group.when_label')} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
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
    </div>
  );
}
