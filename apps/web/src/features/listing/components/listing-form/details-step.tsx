'use client';

// Bước 3: chi tiết theo ATTRIBUTE_FIELDS[category] (một nguồn với Zod và trang chi tiết) + khu gần nhất + khu vực (thôn / xã)
// + ngôn ngữ của tin + lời nhắc quy định. Mọi thuộc tính đều không bắt buộc.
// enum → chip (bấm lại để bỏ chọn) · int / money → ô số (gợi ý hiện giá trị đã định dạng + đơn vị) · bool → checkbox ·
// text → ô chữ · datetime → <input type="datetime-local">.
import type { Site } from '@hp/core';
import { ATTRIBUTE_FIELDS, type AttributeField, type ListingCategory, LOCALES } from '@hp/shared';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { attributeText, asLocale } from '../../display';
import { type AttrInput, type FormValues, parseAmount } from '../../form-values';
import { ChoiceField, Field } from './field';

export function DetailsStep({
  category,
  values,
  sites,
  errors,
  disabled,
  onChange,
}: {
  category: ListingCategory;
  values: FormValues;
  sites: Site[];
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (patch: Partial<FormValues>) => void;
}) {
  const t = useTranslations();
  const setAttr = (key: string, value: string | boolean) => onChange({ attributes: { ...values.attributes, [key]: value } });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-fg">{t('listing.form.details_title')}</h2>
      {ATTRIBUTE_FIELDS[category].map((field) => (
        <AttributeInput
          key={field.key}
          field={field}
          values={values.attributes}
          error={errors[`attributes.${field.key}`]?.[0]}
          disabled={disabled}
          onChange={(v) => setAttr(field.key, v)}
        />
      ))}

      <SiteField sites={sites} value={values.site} disabled={disabled} error={errors.site?.[0]} onChange={(site) => onChange({ site })} />

      <Field
        label={t('listing.form.address_label')}
        hint={t('listing.form.address_hint')}
        error={errors.address_text?.[0]}
        optional
      >
        {(control) => (
          <Input
            {...control}
            value={values.address_text}
            maxLength={200}
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => onChange({ address_text: e.target.value })}
          />
        )}
      </Field>

      <ChoiceField label={t('listing.form.lang_label')} error={errors.lang?.[0]}>
        {LOCALES.map((l) => (
          <ChoiceChip key={l} lang={l} selected={values.lang === l} disabled={disabled} onClick={() => onChange({ lang: l })}>
            {t(`common.locale.${l}`)}
          </ChoiceChip>
        ))}
      </ChoiceField>

      <p role="note" className="flex items-start gap-3 rounded-md bg-warning/15 p-3 text-md text-fg">
        <ShieldAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
        {t('listing.form.rules_hint')}
      </p>
    </div>
  );
}

function AttributeInput({
  field,
  values,
  error,
  disabled,
  onChange,
}: {
  field: AttributeField;
  values: AttrInput;
  error?: string;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const checkboxId = useId();
  const label = t(`listing.attr.${field.key}`);
  const raw = values[field.key];

  switch (field.kind) {
    case 'enum':
      return (
        <ChoiceField label={label} error={error} optional>
          {field.options.map((o) => (
            <ChoiceChip key={o} selected={raw === o} disabled={disabled} onClick={() => onChange(raw === o ? '' : o)}>
              {t(`listing.attr_value.${field.key}.${o}`)}
            </ChoiceChip>
          ))}
        </ChoiceField>
      );
    case 'bool':
      return (
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox id={checkboxId} checked={raw === true} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
          <label htmlFor={checkboxId} className="text-md text-fg">
            {label}
          </label>
        </div>
      );
    case 'int':
    case 'money': {
      const n = typeof raw === 'string' ? parseAmount(raw) : null;
      return (
        <Field label={label} hint={n !== null ? attributeText(field, n, t, locale) : undefined} error={error} optional>
          {(control) => (
            <Input
              {...control}
              value={typeof raw === 'string' ? raw : ''}
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              onChange={(e) => onChange(e.target.value.replace(/[^\d.,\s]/g, ''))}
            />
          )}
        </Field>
      );
    }
    case 'datetime':
      return (
        <Field label={label} error={error} optional>
          {(control) => (
            <Input
              {...control}
              type="datetime-local"
              value={typeof raw === 'string' ? raw : ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case 'text':
      return (
        <Field label={label} error={error} optional>
          {(control) => (
            <Input
              {...control}
              value={typeof raw === 'string' ? raw : ''}
              maxLength={200}
              autoComplete="off"
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
  }
}

/** Khu gần nhất: <select> gốc (bàn phím / trình đọc màn hình sẵn có), mặc định = khu trong hồ sơ. */
function SiteField({
  sites,
  value,
  disabled,
  error,
  onChange,
}: {
  sites: Site[];
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('listing.form');
  return (
    <Field label={t('site_label')} error={error} optional>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-12 w-full appearance-none rounded-sm border border-border bg-surface pr-10 pl-3 text-md text-fg outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30 disabled:bg-surface-2"
          >
            <option value="">{t('select_placeholder')}</option>
            {sites.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted"
          />
        </div>
      )}
    </Field>
  );
}
