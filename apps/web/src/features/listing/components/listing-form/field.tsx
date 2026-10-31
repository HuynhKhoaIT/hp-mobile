'use client';

// Một ô form: nhãn (+ "Không bắt buộc") · điều khiển · gợi ý · lỗi (errors.*). Gắn id / aria-describedby / aria-invalid
// cho điều khiển qua render prop để trình đọc màn hình đọc đủ nhãn, gợi ý và lỗi.
import { useTranslations } from 'next-intl';
import { type ReactNode, useId } from 'react';
import { useErrorText } from '@/features/auth/components/use-error-text';

export type ControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true };

export function Field({
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  label: string;
  hint?: ReactNode;
  /** Mã lỗi errors.* của ô (lỗi đầu). */
  error?: string | null;
  optional?: boolean;
  children: (control: ControlProps) => ReactNode;
}) {
  const t = useTranslations('listing.form');
  const errorText = useErrorText();
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-2 text-md font-medium text-fg">
        {label}
        {optional ? <span className="text-sm font-normal text-muted">{t('optional')}</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true as const } : {}) })}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}

/** Nhóm lựa chọn dạng chip (enum, hình thức giá): fieldset + legend thay cho label. */
export function ChoiceField({
  label,
  error,
  optional = false,
  children,
}: {
  label: string;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('listing.form');
  const errorText = useErrorText();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex flex-wrap items-baseline gap-2 text-md font-medium text-fg">
        {label}
        {optional ? <span className="text-sm font-normal text-muted">{t('optional')}</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error ? <p className="text-sm text-danger">{errorText(error)}</p> : null}
    </fieldset>
  );
}
