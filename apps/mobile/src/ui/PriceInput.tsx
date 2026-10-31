// PriceInput — nhập giá VND bằng bàn phím số; hiển thị có dấu phân cách theo ngôn ngữ (1.500.000 / 1,500,000).
// Giá trị ra là số nguyên đồng (numeric(14,0)) hoặc null khi để trống.
import { Input, type InputProps } from './Input';
import { formatNumber } from '@/lib/format';

const MAX = 99_999_999_999_999; // numeric(14,0)

export type PriceInputProps = Omit<InputProps, 'value' | 'onChangeText' | 'onChange' | 'keyboardType'> & {
  value: number | null;
  onChange: (value: number | null) => void;
};

export function PriceInput({ value, onChange, ...rest }: PriceInputProps) {
  return (
    <Input
      keyboardType="number-pad"
      inputMode="numeric"
      value={value === null ? '' : formatNumber(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, '');
        if (!digits) return onChange(null);
        onChange(Math.min(Number(digits), MAX));
      }}
      suffix="₫"
      {...rest}
    />
  );
}
