// ConfirmSheet — xác nhận hành động khó hoàn tác bằng BottomSheet (thay Alert.alert): tiêu đề, giải thích,
// nút chính ghi rõ việc ("Chặn", "Xoá tin" — không "OK") + nút Huỷ.
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './BottomSheet';
import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export type ConfirmSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  confirmLabel: string;
  confirmVariant?: Extract<ButtonVariant, 'primary' | 'danger'>;
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmSheet({ open, onClose, title, body, confirmLabel, confirmVariant = 'danger', loading, onConfirm }: ConfirmSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {body ? <Text tone="muted">{body}</Text> : null}
      <Button label={confirmLabel} variant={confirmVariant} fullWidth loading={loading} onPress={onConfirm} />
      <Button label={t('actions.cancel')} variant="ghost" fullWidth onPress={onClose} />
    </BottomSheet>
  );
}
