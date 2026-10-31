// Select / MultiSelect — ô chọn trông như Input; chạm mở BottomSheet danh sách (dùng được một tay).
// Lựa chọn đang chọn có dấu tích + accessibilityState (không chỉ đổi màu).
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { Text } from './Text';

export type SelectOption<T extends string> = { value: T; label: string };

type FieldProps = { label?: string; error?: string | null; hint?: string; placeholder?: string };

function Field({
  label,
  error,
  hint,
  display,
  placeholder,
  onPress,
}: FieldProps & { display: string | null; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: display ?? '' }}
        accessibilityHint={error ?? hint}
        onPress={onPress}
        className={`min-h-12 flex-row items-center gap-2 rounded-sm border bg-surface px-3 ${error ? 'border-danger' : 'border-border'}`}
      >
        <Text tone={display ? 'default' : 'disabled'} className="flex-1">
          {display ?? placeholder ?? t('select.placeholder')}
        </Text>
        <Icon icon={ChevronDown} tone="muted" />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`min-h-12 flex-row items-center gap-3 rounded-md px-3 ${selected ? 'bg-primary-light' : 'bg-transparent'}`}
    >
      <Text tone={selected ? 'primary' : 'default'} className="flex-1">
        {label}
      </Text>
      {selected ? <Icon icon={Check} tone="primary" /> : null}
    </Pressable>
  );
}

/**
 * trigger 'field' (mặc định): ô như Input trong form. 'chip': viên lọc trong FilterBar — hiện nhãn lựa chọn,
 * đánh dấu chọn khi giá trị khác `neutralValue` (vd "Mọi khu").
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  trigger = 'field',
  neutralValue,
  ...field
}: FieldProps & {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  trigger?: 'field' | 'chip';
  neutralValue?: T;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      {trigger === 'chip' ? (
        <Chip
          label={selected?.label ?? field.placeholder ?? t('select.placeholder')}
          selected={value !== null && value !== neutralValue}
          trailingIcon={ChevronDown}
          accessibilityLabel={field.label}
          accessibilityValue={{ text: selected?.label ?? '' }}
          onPress={() => setOpen(true)}
        />
      ) : (
        <Field {...field} display={selected?.label ?? null} onPress={() => setOpen(true)} />
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={field.label}>
        <View className="gap-1">
          {options.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              selected={o.value === value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

export function MultiSelect<T extends string>({
  values,
  options,
  onChange,
  ...field
}: FieldProps & { values: T[]; options: SelectOption<T>[]; onChange: (values: T[]) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <>
      <Field {...field} display={labels.length ? labels.join(', ') : null} onPress={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={field.label}>
        <View className="gap-1">
          {options.map((o) => (
            <OptionRow key={o.value} label={o.label} selected={values.includes(o.value)} onPress={() => toggle(o.value)} />
          ))}
        </View>
        <Button label={t('actions.done')} fullWidth onPress={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}
