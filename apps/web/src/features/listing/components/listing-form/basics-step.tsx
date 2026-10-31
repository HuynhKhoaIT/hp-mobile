'use client';

// Bước 2: thông tin chính — tiêu đề (+ gợi ý), hình thức giá (chip) + giá (chỉ pass đồ / trọ), mô tả.
import { formatMoney, type ListingFeature, PRICE_TYPES } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { asLocale } from '../../display';
import { type FormValues, hasPrice, parseAmount } from '../../form-values';
import { ChoiceField, Field } from './field';

export function BasicsStep({
  feature,
  values,
  errors,
  disabled,
  onChange,
}: {
  feature: ListingFeature;
  values: FormValues;
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (patch: Partial<FormValues>) => void;
}) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const amount = parseAmount(values.price);
  const money = amount !== null ? formatMoney(amount, locale) : null;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-fg">{t('web.post.step_basics')}</h2>
      <Field label={t('listing.form.title_label')} hint={t('listing.form.title_hint')} error={errors.title?.[0]}>
        {(control) => (
          <Input
            {...control}
            value={values.title}
            maxLength={120}
            required
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        )}
      </Field>

      {hasPrice(feature) ? (
        <>
          <ChoiceField label={t('listing.form.price_type_label')} error={errors.price_type?.[0]}>
            {PRICE_TYPES.map((p) => (
              <ChoiceChip key={p} selected={values.price_type === p} disabled={disabled} onClick={() => onChange({ price_type: p })}>
                {t(`listing.form.price_type.${p}`)}
              </ChoiceChip>
            ))}
          </ChoiceField>
          {values.price_type === 'fixed' ? (
            <Field
              label={t('listing.form.price_label')}
              hint={money ? (feature === 'room' ? t('listing.card.per_month', { price: money }) : money) : undefined}
              error={errors.price?.[0]}
            >
              {(control) => (
                <Input
                  {...control}
                  value={values.price}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={disabled}
                  onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.,\s]/g, '') })}
                />
              )}
            </Field>
          ) : null}
        </>
      ) : null}

      <Field
        label={t('listing.form.description_label')}
        hint={t('listing.form.description_hint')}
        error={errors.description?.[0]}
        optional
      >
        {(control) => (
          <Textarea
            {...control}
            value={values.description}
            maxLength={5000}
            rows={6}
            disabled={disabled}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}
