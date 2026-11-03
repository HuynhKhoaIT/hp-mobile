'use client';

// Đội đã có sẵn người (chỉ tính năng có cfg.hasLineup — ghép trận): ô đánh dấu → ô số attributes.players_have (tính cả
// chủ nhóm, 1..GROUP_RULES.maxSeats) với nút − / + và xem trước "Đội đủ N người khi có thêm M người"
// (N = có sẵn + số người cần thêm). Tắt → bỏ khoá khỏi attributes. Khớp app (LineupField, config.form.lineup).
import { GROUP_RULES } from '@hp/shared';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/features/listing/components/listing-form/field';

/** Giá trị khi vừa bật (giống app DEFAULT_PLAYERS_HAVE). */
export const DEFAULT_PLAYERS_HAVE = 1;

const digits = (s: string) => s.replace(/\D/g, '');

export function LineupField({
  value,
  seats,
  error,
  disabled,
  onChange,
}: {
  /** Chuỗi trong ô số; null = chưa bật. */
  value: string | null;
  /** Số người cần thêm (seats_total) đang nhập — cho dòng xem trước. */
  seats: number;
  /** Mã lỗi errors.* của attributes.players_have. */
  error: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const t = useTranslations('group.form');
  const toggleId = useId();
  const on = value !== null;
  const have = on ? Number(digits(value)) : 0;
  const step = (delta: number) => {
    const base = Number.isFinite(have) && have > 0 ? have : DEFAULT_PLAYERS_HAVE;
    onChange(String(Math.min(GROUP_RULES.maxSeats, Math.max(1, base + delta))));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id={toggleId}
          checked={on}
          disabled={disabled}
          onCheckedChange={(v) => onChange(v === true ? String(DEFAULT_PLAYERS_HAVE) : null)}
        />
        <label htmlFor={toggleId} className="text-md font-medium text-fg">
          {t('players_have_toggle')}
        </label>
      </div>

      {on ? (
        <div className="flex flex-col gap-2 border-l-2 border-border pl-4">
          <Field label={t('players_have_label')} hint={t('players_have_hint')} error={error}>
            {(control) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled || have <= 1}
                  aria-label={t('players_have_decrease')}
                  aria-controls={control.id}
                  onClick={() => step(-1)}
                >
                  <Minus strokeWidth={1.75} aria-hidden />
                </Button>
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={GROUP_RULES.maxSeats}
                  step={1}
                  value={value}
                  disabled={disabled}
                  className="w-20 text-center"
                  onChange={(e) => onChange(digits(e.target.value))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled || have >= GROUP_RULES.maxSeats}
                  aria-label={t('players_have_increase')}
                  aria-controls={control.id}
                  onClick={() => step(1)}
                >
                  <Plus strokeWidth={1.75} aria-hidden />
                </Button>
              </div>
            )}
          </Field>
          <p aria-live="polite" className="text-sm font-medium text-primary">
            {have > 0 && seats > 0 ? t('lineup_preview', { total: have + seats, count: seats }) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
