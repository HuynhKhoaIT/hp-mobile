'use client';

// Bước 3: chi tiết — style Stitch L2 (khớp app), các thẻ:
//   "Thông tin thêm": thông số còn lại theo ATTRIBUTE_FIELDS[category] (trừ thông số đã lên bước 2 và trường ẩn của
//     config.form — splitAttributeFields) + ngôn ngữ của tin. Mọi thuộc tính đều không bắt buộc.
//   "Khu vực": chip khu gần nhất (danh sách sites thật, mặc định khu trong hồ sơ; bấm lại để bỏ chọn) + khu vực (thôn / xã).
//   "Liên hệ": người xem nhắn tin trong app; SĐT của mình (profiles.phone) chỉ hiện qua "Hiện số" sau đăng nhập.
//   Hộp quy định (SafetyTip).
// enum → chip (bấm lại để bỏ chọn) · int / money → ô số (gợi ý hiện giá trị đã định dạng + đơn vị) · bool → checkbox ·
// text → ô chữ · datetime → <input type="datetime-local">.
import type { Site } from '@hp/core';
import { type AttributeField, formatVnPhone, LOCALES } from '@hp/shared';
import { ListChecks, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { attributeText, asLocale } from '../../display';
import { type AttrInput, type FormValues, parseAmount } from '../../form-values';
import { SafetyTip } from '../safety-tip';
import { ChoiceField, Field } from './field';
import { FormSection } from './section';

export function DetailsStep({
  fields,
  values,
  sites,
  phone,
  errors,
  disabled,
  onChange,
}: {
  /** Thông số hiện ở bước này (splitAttributeFields(...).details). */
  fields: readonly AttributeField[];
  values: FormValues;
  sites: Site[];
  /** profiles.phone (84…) của người đăng — null khi tài khoản chưa có số. */
  phone: string | null;
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (patch: Partial<FormValues>) => void;
}) {
  const t = useTranslations();
  const setAttr = (key: string, value: string | boolean) => onChange({ attributes: { ...values.attributes, [key]: value } });

  return (
    <div className="flex flex-col gap-4">
      <FormSection icon={ListChecks} title={t('listing.form.details_title')} subtitle={t('listing.form.optional')}>
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
        <ChoiceField label={t('listing.form.lang_label')} error={errors.lang?.[0]}>
          {LOCALES.map((l) => (
            <ChoiceChip key={l} lang={l} selected={values.lang === l} disabled={disabled} onClick={() => onChange({ lang: l })}>
              {t(`common.locale.${l}`)}
            </ChoiceChip>
          ))}
        </ChoiceField>
      </FormSection>

      <FormSection icon={MapPin} title={t('listing.detail.location')}>
        <ChoiceField label={t('listing.form.site_label')} error={errors.site?.[0]} optional>
          <ChoiceChip selected={!values.site} disabled={disabled} onClick={() => onChange({ site: '' })}>
            {t('listing.form.site_none')}
          </ChoiceChip>
          {sites.map((s) => (
            <ChoiceChip
              key={s.code}
              selected={values.site === s.code}
              disabled={disabled}
              onClick={() => onChange({ site: values.site === s.code ? '' : s.code })}
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
              {s.name}
            </ChoiceChip>
          ))}
        </ChoiceField>
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
      </FormSection>

      <FormSection icon={Phone} title={t('listing.form.contact_title')}>
        <ul className="flex flex-col gap-3 text-md">
          <li className="flex items-start gap-2 text-fg">
            <MessageCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
            {t('listing.form.contact_chat')}
          </li>
          <li className="flex items-start gap-2 text-muted">
            <Phone aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
            {phone ? t('listing.form.contact_phone', { phone: formatVnPhone(phone) }) : t('listing.form.contact_no_phone')}
          </li>
        </ul>
      </FormSection>

      <SafetyTip title={t('listing.tip.title')} text={t('listing.form.rules_hint')} />
    </div>
  );
}

export function AttributeInput({
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
