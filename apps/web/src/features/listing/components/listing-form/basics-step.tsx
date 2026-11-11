'use client';

// Bước 2: thông tin chính — style Stitch L2 (khớp app), hai thẻ:
//   "Thông tin chính": tiêu đề (+ gợi ý riêng theo config.form.titleHintKey) · thông số chính theo config.form.primaryAttributes
//     (vd tình trạng; loại đồ + nơi + thời điểm mất / nhặt; ca + lương) · mô tả (gợi ý theo config.form.descriptionHintKey).
//   "Giá" (chỉ pass đồ / trọ): hình thức giá (chip) + giá.
import { type AttributeField, formatMoney, type ListingFeature, PRICE_TYPES } from '@hp/shared';
import { Banknote, PencilLine } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { asLocale } from '../../display';
import type { ListingFormDisplay } from '../../feature-config';
import { type FormValues, hasPrice, parseAmount } from '../../form-values';
import { AttributeInput } from './details-step';
import { ChoiceField, Field } from './field';
import { FormSection } from './section';

export function BasicsStep({
  feature,
  fields,
  display,
  values,
  errors,
  disabled,
  onChange,
}: {
  feature: ListingFeature;
  /** Thông số hiện ở bước này (splitAttributeFields(...).primary). */
  fields: readonly AttributeField[];
  display?: ListingFormDisplay;
  values: FormValues;
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (patch: Partial<FormValues>) => void;
}) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const amount = parseAmount(values.price);
  const money = amount !== null ? formatMoney(amount, locale) : null;
  const setAttr = (key: string, value: string | boolean) => onChange({ attributes: { ...values.attributes, [key]: value } });

  return (
    <div className="flex flex-col gap-4">
      <FormSection icon={PencilLine} title={t('web.post.step_basics')}>
        <Field label={t('listing.form.title_label')} hint={t(display?.titleHintKey ?? 'listing.form.title_hint')} error={errors.title?.[0]}>
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

        {fields.map((field) => (
          <AttributeInput
            key={field.key}
            field={field}
            values={values.attributes}
            error={errors[`attributes.${field.key}`]?.[0]}
            disabled={disabled}
            onChange={(v) => setAttr(field.key, v)}
          />
        ))}

        <Field
          label={t('listing.form.description_label')}
          hint={t(display?.descriptionHintKey ?? 'listing.form.description_hint')}
          error={errors.description?.[0]}
          optional
        >
          {(control) => (
            <Textarea
              {...control}
              value={values.description}
              maxLength={5000}
              rows={5}
              disabled={disabled}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          )}
        </Field>
      </FormSection>

      {hasPrice(feature) ? (
        <FormSection icon={Banknote} title={t('listing.form.price_title')}>
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
                  className="text-lg font-bold text-primary"
                  onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.,\s]/g, '') })}
                />
              )}
            </Field>
          ) : null}
        </FormSection>
      ) : null}
    </div>
  );
}
