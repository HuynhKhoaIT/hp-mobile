// ReportSheet — báo cáo tin / nhóm / hồ sơ / tin nhắn: chọn 1 lý do (REPORT_REASONS), mô tả thêm tuỳ chọn,
// nút "Gửi báo cáo". Chỉ giao diện: gửi do nơi dùng (useReportAction ở @/core/report gọi @hp/core).
import { REPORT_DETAIL_MAX, REPORT_REASONS, type ReportReason, type ReportTarget } from '@hp/shared';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { Input } from './Input';
import { Text } from './Text';

export type ReportSheetProps = {
  open: boolean;
  onClose: () => void;
  target: ReportTarget;
  loading?: boolean;
  onSubmit: (v: { reason: ReportReason; detail?: string }) => void;
};

export function ReportSheet({ open, onClose, target, loading, onSubmit }: ReportSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  // Mở lại sheet → form trống (đặt lại ngay khi render, không qua effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(null);
      setDetail('');
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('report.title', { target: t(`report.targets.${target}`) })}>
      <Text tone="muted">{t('report.subtitle')}</Text>
      <View accessibilityRole="radiogroup" className="overflow-hidden rounded-md border border-border">
        {REPORT_REASONS.map((r, i) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setReason(r)}
              className={[
                'min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-surface-2',
                i > 0 ? 'border-t border-border' : '',
                selected ? 'bg-primary-light' : 'bg-surface',
              ].join(' ')}
            >
              <View
                className={[
                  'h-6 w-6 items-center justify-center rounded-full border',
                  selected ? 'border-primary bg-primary' : 'border-border bg-surface',
                ].join(' ')}
              >
                {selected ? <Icon icon={Check} tone="onPrimary" size={16} /> : null}
              </View>
              <Text variant="label" className="flex-1">
                {t(`report.reasons.${r}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        label={t('report.detail_label')}
        placeholder={t('report.detail_placeholder')}
        value={detail}
        onChangeText={setDetail}
        maxLength={REPORT_DETAIL_MAX}
        multiline
      />
      <Button
        label={t('report.submit')}
        variant="danger"
        fullWidth
        disabled={!reason}
        loading={loading}
        onPress={() => reason && onSubmit({ reason, detail: detail.trim() || undefined })}
      />
    </BottomSheet>
  );
}
