'use client';

// Dialog gửi / sửa báo giá của thợ (chi tiết yêu cầu): giá (bắt buộc, 1.000 – 1.000.000.000 ₫) → ghi chú (≤ 500, không SĐT:
// server lọc, báo lỗi message_has_phone ở ô ghi chú) → "Gửi báo giá" / "Cập nhật báo giá". Kiểm bằng SubmitQuoteInput
// (@hp/shared) trước khi gọi; lỗi server (request_closed, rate_limited…) hiện toast ở useRequestActions. Khớp QuoteSheet của app.
import type { MyQuoteForRequest } from '@hp/core';
import type { SubmitQuoteVars } from '@hp/core/react';
import { formatMoney, SERVICE_REQUEST_RULES, SubmitQuoteInput } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { MoneyInput } from './money-input';

export function QuoteDialog({
  open,
  onOpenChange,
  requestId,
  existing,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  /** Báo giá hiện có (đang gửi → sửa; đã rút → gửi lại với giá cũ làm gợi ý). */
  existing: MyQuoteForRequest | null;
  pending: boolean;
  onSubmit: (vars: SubmitQuoteVars, edited: boolean) => void;
}) {
  const t = useTranslations('tho');
  const tc = useTranslations('common');
  const locale = asLocale(useLocale());
  const errorText = useErrorText();
  const priceId = useId();
  const noteId = useId();
  const [price, setPrice] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ price?: string; note?: string }>({});
  const edited = existing?.status === 'submitted';

  // Mỗi lần mở: điền sẵn báo giá cũ (sửa / gửi lại), xoá lỗi cũ (đặt lại ngay khi render, không qua effect).
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
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent closeLabel={tc('actions.close')}>
        <DialogHeader>
          <DialogTitle>{t(edited ? 'quote.sheet_edit_title' : 'quote.sheet_title')}</DialogTitle>
          <DialogDescription>
            {t('quote.price_hint', { min: formatMoney(SERVICE_REQUEST_RULES.priceMin, locale), max: formatMoney(SERVICE_REQUEST_RULES.priceMax, locale) })}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={priceId}>{t('quote.price')}</Label>
            <MoneyInput id={priceId} value={price} onChange={setPrice} aria-invalid={!!errors.price || undefined} disabled={pending} />
            {errors.price ? (
              <p role="alert" className="text-sm text-danger">
                {errorText(errors.price)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={noteId}>{t('quote.note')}</Label>
            <Textarea
              id={noteId}
              value={note}
              rows={3}
              maxLength={SERVICE_REQUEST_RULES.noteMax}
              placeholder={t('quote.note_placeholder')}
              disabled={pending}
              aria-invalid={!!errors.note || undefined}
              onChange={(e) => setNote(e.target.value)}
            />
            {errors.note ? (
              <p role="alert" className="text-sm text-danger">
                {errorText(errors.note)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {t(edited ? 'quote.update' : 'quote.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
