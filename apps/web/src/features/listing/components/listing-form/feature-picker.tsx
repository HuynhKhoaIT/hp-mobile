'use client';

// Bước 0 "Đăng nhanh": chọn tính năng (4 ô, icon + màu dịch vụ từ config.ts) rồi danh mục (chip, khi tính năng có > 1).
// Dưới cùng: "Hoặc tạo nhóm ghép" — link sang /tao-nhom/ride | sport (form riêng của mẫu Group, giống nút Đăng của app).
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { GROUP_KINDS } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { GROUP_FEATURE_CONFIGS } from '@/features/group/features';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LISTING_FEATURE_CONFIGS, LISTING_FEATURE_ORDER } from '../../features';

export function FeaturePicker({
  feature,
  category,
  onFeature,
  onCategory,
}: {
  feature: ListingFeature | null;
  category: ListingCategory | null;
  onFeature: (f: ListingFeature) => void;
  onCategory: (c: ListingCategory) => void;
}) {
  const t = useTranslations();
  const categories = feature ? LISTING_FEATURE_CONFIGS[feature].categories : [];

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold text-fg">{t('listing.form.choose_feature')}</legend>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LISTING_FEATURE_ORDER.map((f) => {
            const cfg = LISTING_FEATURE_CONFIGS[f];
            const selected = feature === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={selected}
                onClick={() => onFeature(f)}
                className={cn(
                  'flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border bg-surface p-4 text-md font-medium text-fg shadow-card outline-none transition-colors',
                  'focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected ? 'border-primary bg-primary-light' : 'border-border hover:bg-surface-2',
                )}
              >
                <span className={cn('flex size-12 items-center justify-center rounded-full', cfg.tone.soft)}>
                  <cfg.Icon aria-hidden strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
                </span>
                {t(`common.feature.${f}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {categories.length > 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lg font-semibold text-fg">{t('listing.form.choose_category')}</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <ChoiceChip key={c} selected={category === c} onClick={() => onCategory(c)}>
                {t(`common.category.${c}`)}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
      ) : null}

      {!feature ? (
        <nav aria-labelledby="create-group-heading" className="flex flex-col gap-3">
          <h2 id="create-group-heading" className="text-lg font-semibold text-fg">
            {t('web.group.create_section')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GROUP_KINDS.map((kind) => {
              const cfg = GROUP_FEATURE_CONFIGS[kind];
              return (
                <li key={kind} className="flex flex-col *:flex-1">
                  <Link
                    href={cfg.createPath}
                    className={cn(
                      'flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface p-4 text-center text-md font-medium text-fg shadow-card outline-none transition-colors',
                      'hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50',
                    )}
                  >
                    <span className={cn('flex size-12 items-center justify-center rounded-full', cfg.tone.soft)}>
                      <cfg.Icon aria-hidden strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
                    </span>
                    {t(`group.list.create_${kind}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
