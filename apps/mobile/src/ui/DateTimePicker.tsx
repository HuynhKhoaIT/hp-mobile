// DateTimePicker — chọn ngày + giờ (giờ hẹn của nhóm ghép) bằng hai ô "Ngày" / "Giờ" trông như Input.
// Android: hộp thoại hệ thống (DateTimePickerAndroid, 24 giờ). iOS: BottomSheet có lịch inline / bánh xe giờ + nút Xong.
// Expo web (chỉ để xem thử khi phát triển — app không phát hành bản web): BottomSheet chip các ngày tới + chip giờ mỗi
// `minuteInterval` phút. Giá trị vào / ra là Date; luôn kẹp trong [minimumDate, maximumDate], giờ làm tròn theo bước.
// Nhãn ngày / giờ hiển thị qua @/lib/format (giờ Việt Nam); chữ của ô do nơi gọi truyền vào (đã dịch).
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import { formatDate } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from './theme';

type Mode = 'date' | 'time';
type MinuteInterval = 5 | 10 | 15 | 30;

export type DateTimePickerProps = {
  label?: string;
  value: Date | null;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Bước phút của giờ (mặc định 15). */
  minuteInterval?: MinuteInterval;
  /** Nhãn hai ô (đã dịch, vd "Ngày" / "Giờ"). */
  dateLabel: string;
  timeLabel: string;
  /** Chữ khi chưa chọn (đã dịch, vd "Chọn ngày" / "Chọn giờ"). */
  datePlaceholder: string;
  timePlaceholder: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Web: số ngày tối đa hiện thành chip (đủ cho hẹn trong tháng). */
const WEB_MAX_DAYS = 30;

/** Làm tròn lên mốc `step` phút kế tiếp (giây = 0). */
function roundUp(d: Date, step: number): Date {
  const ms = step * MINUTE;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function clamp(d: Date, min: Date | undefined, max: Date | undefined, step: number): Date {
  if (min && d < min) return roundUp(min, step);
  if (max && d > max) return max;
  return d;
}

/** Ghép ngày của `day` với giờ phút của `time` (giờ máy). */
function withDay(time: Date, day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DateTimePicker({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  minuteInterval = 15,
  dateLabel,
  timeLabel,
  datePlaceholder,
  timePlaceholder,
  hint,
  error,
  disabled = false,
}: DateTimePickerProps) {
  const [sheet, setSheet] = useState<Mode | null>(null);
  /** Giá trị gốc khi chưa chọn gì: mốc hợp lệ sớm nhất. */
  const base = value ?? roundUp(minimumDate ?? new Date(), minuteInterval);
  const commit = (next: Date) => onChange(clamp(next, minimumDate, maximumDate, minuteInterval));

  const open = (mode: Mode) => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        maximumDate: mode === 'date' ? maximumDate : undefined,
        onValueChange: (_e, picked) => commit(mode === 'date' ? withDay(base, picked) : withDay(picked, base)),
      });
      return;
    }
    setSheet(mode);
  };

  return (
    <View className="gap-2">
      {label ? <Text variant="label">{label}</Text> : null}
      <View className="flex-row gap-2">
        <Field
          icon={CalendarDays}
          label={dateLabel}
          text={value ? formatDate(value, 'date') : null}
          placeholder={datePlaceholder}
          error={!!error}
          disabled={disabled}
          onPress={() => open('date')}
        />
        <Field
          icon={Clock}
          label={timeLabel}
          text={value ? formatDate(value, 'time') : null}
          placeholder={timePlaceholder}
          error={!!error}
          disabled={disabled}
          onPress={() => open('time')}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
      {Platform.OS === 'android' ? null : (
        <PickerSheet
          mode={sheet}
          title={sheet === 'time' ? timePlaceholder : datePlaceholder}
          base={base}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          minuteInterval={minuteInterval}
          onClose={() => setSheet(null)}
          onPick={(next) => {
            commit(next);
            setSheet(null);
          }}
        />
      )}
    </View>
  );
}

function Field({
  icon,
  label,
  text,
  placeholder,
  error,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  text: string | null;
  placeholder: string;
  error: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: text ?? placeholder }}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={[
        'min-h-12 flex-1 flex-row items-center gap-2 rounded-sm border px-3 py-2 active:bg-surface-2',
        error ? 'border-danger' : 'border-border',
        disabled ? 'bg-surface-2 opacity-50' : 'bg-surface',
      ].join(' ')}
    >
      <Icon icon={icon} tone="muted" />
      <View className="flex-1">
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text tone={text ? 'default' : 'disabled'}>{text ?? placeholder}</Text>
      </View>
    </Pressable>
  );
}

type SheetProps = {
  mode: Mode | null;
  title: string;
  base: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval: MinuteInterval;
  onClose: () => void;
  onPick: (value: Date) => void;
};

/** iOS: picker hệ thống trong sheet; web: chip. Giá trị tạm giữ trong sheet tới khi bấm Xong (iOS) / chạm chip (web). */
function PickerSheet(props: SheetProps) {
  return (
    <BottomSheet open={props.mode !== null} onClose={props.onClose} title={props.title}>
      {props.mode === null ? null : Platform.OS === 'ios' ? <IosPicker key={props.mode} {...props} mode={props.mode} /> : <WebChips {...props} mode={props.mode} />}
    </BottomSheet>
  );
}

function IosPicker({ mode, base, minimumDate, maximumDate, minuteInterval, onPick }: SheetProps & { mode: Mode }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [draft, setDraft] = useState(base);
  return (
    <View className="gap-3">
      <RNDateTimePicker
        value={draft}
        mode={mode}
        display={mode === 'date' ? 'inline' : 'spinner'}
        minimumDate={mode === 'date' ? minimumDate : undefined}
        maximumDate={mode === 'date' ? maximumDate : undefined}
        minuteInterval={minuteInterval}
        locale={i18n.language}
        themeVariant={theme.scheme}
        accentColor={theme.colors.primary}
        textColor={theme.colors.text}
        onValueChange={(_e, picked) => setDraft(mode === 'date' ? withDay(draft, picked) : withDay(picked, draft))}
      />
      <Button label={t('actions.done')} fullWidth onPress={() => onPick(draft)} />
    </View>
  );
}

function WebChips({ mode, base, minimumDate, maximumDate, minuteInterval, onPick }: SheetProps & { mode: Mode }) {
  const min = minimumDate ?? new Date();
  if (mode === 'date') {
    const first = startOfDay(min);
    const lastMs = maximumDate ? startOfDay(maximumDate).getTime() : first.getTime() + (WEB_MAX_DAYS - 1) * DAY;
    const days: Date[] = [];
    for (let i = 0; i < WEB_MAX_DAYS; i += 1) {
      const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      if (d.getTime() > lastMs) break;
      days.push(d);
    }
    const selected = startOfDay(base).getTime();
    return (
      <View className="flex-row flex-wrap gap-2">
        {days.map((d) => (
          <Chip
            key={d.getTime()}
            label={formatDate(d, 'date')}
            selected={d.getTime() === selected}
            onPress={() => onPick(withDay(base, d))}
          />
        ))}
      </View>
    );
  }
  const day = startOfDay(base);
  const slots: Date[] = [];
  for (let m = 0; m < 24 * 60; m += minuteInterval) {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
    if (d >= min && (!maximumDate || d <= maximumDate)) slots.push(d);
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {slots.map((d) => (
        <Chip key={d.getTime()} label={formatDate(d, 'time')} selected={d.getTime() === base.getTime()} onPress={() => onPick(d)} />
      ))}
    </View>
  );
}
