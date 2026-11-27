// Sheet gửi / sửa báo giá của thợ (chi tiết yêu cầu): giá (bắt buộc, 1.000 – 1.000.000.000 ₫) → ghi chú (≤ 500, không SĐT:
// server lọc, báo lỗi message_has_phone ở ô ghi chú) → "Gửi báo giá" / "Cập nhật báo giá". Kiểm bằng SubmitQuoteInput
// (@hp/shared) trước khi gọi; lỗi server (request_closed, rate_limited…) hiện toast ở useRequestActions.
import type { MyQuoteForRequest } from '@hp/core';
import { SERVICE_REQUEST_RULES, SubmitQuoteInput } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorText } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { BottomSheet, Button, Input, PriceInput } from '@/ui';
import type { SubmitQuoteVars } from '@hp/core/react';

export type QuoteSheetProps = {
  open: boolean;
  onClose: () => void;
  requestId: string;
  /** Báo giá hiện có (đang gửi → sửa; đã rút → gửi lại với giá cũ làm gợi ý). */
  existing: MyQuoteForRequest | null;
  pending: boolean;
  onSubmit: (vars: SubmitQuoteVars, edited: boolean) => void;
};

export function QuoteSheet({ open, onClose, requestId, existing, pending, onSubmit }: QuoteSheetProps) {
  const { t } = useTranslation('tho');
  const errorText = useErrorText();
  const [price, setPrice] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ price?: string; note?: string }>({});
  const edited = existing?.status === 'submitted';

  // Mỗi lần mở: điền sẵn báo giá cũ (sửa / gửi lại), xoá lỗi cũ (đặt lại ngay khi render, không qua effect — như ReportSheet).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPrice(existing ? existing.price : null);
      setNote(existing?.note ?? '');
      setErrors({});
    }
  }

  const submit = () => {
    const parsed = SubmitQuoteInput.safeParse({ requestId, price: price ?? 0, note: note.trim() || null });
    if (!parsed.success) {
      const next: { price?: string; note?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === 'note' ? 'note' : 'price';
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({ price: parsed.data.price, availableAt: parsed.data.availableAt, note: parsed.data.note }, edited);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t(edited ? 'quote.sheet_edit_title' : 'quote.sheet_title')}>
      <PriceInput
        label={t('quote.price')}
        hint={t('quote.price_hint', { min: formatMoney(SERVICE_REQUEST_RULES.priceMin), max: formatMoney(SERVICE_REQUEST_RULES.priceMax) })}
        value={price}
        onChange={setPrice}
        error={errors.price ? errorText(errors.price) : null}
      />
      <Input
        label={`${t('quote.note')}`}
        placeholder={t('quote.note_placeholder')}
        value={note}
        onChangeText={setNote}
        maxLength={SERVICE_REQUEST_RULES.noteMax}
        multiline
        textAlignVertical="top"
        error={errors.note ? errorText(errors.note) : null}
        className="min-h-24"
      />
      <Button label={t(edited ? 'quote.update' : 'quote.submit')} fullWidth loading={pending} onPress={submit} />
    </BottomSheet>
  );
}
