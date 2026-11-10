// Xác nhận xoá tài khoản (tab Tôi): giải thích hậu quả (ẩn ngay, xoá hẳn sau 30 ngày, không hoàn tác) → ô gõ từ xác
// nhận (common.account.delete_confirm_word, vd "XOA") → nút đỏ ghi rõ "Xoá vĩnh viễn tài khoản" chỉ bật khi gõ đúng.
// Xoá xong: đăng xuất (gỡ push token, xoá cache) + toast "Tài khoản đã được xoá".
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, Input, Text } from '@/ui';
import { useDeleteAccountFlow } from '../hooks';

export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const flow = useDeleteAccountFlow();
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === flow.confirmWord.toUpperCase();

  const close = () => {
    if (flow.isPending) return;
    setTyped('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title={t('account.delete_title')}>
      <Text tone="muted">{t('account.delete_body')}</Text>
      <Input
        label={t('account.delete_confirm_label')}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!flow.isPending}
      />
      <Button
        label={t('account.delete_action')}
        variant="danger"
        fullWidth
        disabled={!matches}
        loading={flow.isPending}
        onPress={() =>
          flow.run(() => {
            setTyped('');
            onClose();
          })
        }
      />
      <Button label={t('actions.cancel')} variant="ghost" fullWidth disabled={flow.isPending} onPress={close} />
    </BottomSheet>
  );
}
