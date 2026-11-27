'use client';

// Ô nhập số tiền VND (giá báo, ngân sách): chỉ nhận chữ số, hiện có dấu phân cách theo locale (formatNumber), trả về số
// nguyên hoặc null khi rỗng. inputMode="numeric" để điện thoại hiện bàn phím số.
import { formatNumber } from '@hp/shared';
import { useLocale } from 'next-intl';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { asLocale } from '@/features/listing/display';

const MAX = 1_000_000_000;

export function MoneyInput({
  value,
  onChange,
  ...rest
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode'> & { value: number | null; onChange: (value: number | null) => void }) {
  const locale = asLocale(useLocale());
  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value === null ? '' : formatNumber(value, locale)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits ? Math.min(Number(digits), MAX) : null);
      }}
    />
  );
}
