'use client';

// Hộp thoại "Gọi" CSKH: mở ra là lấy SĐT của bên đó (RPC reveal_cskh_phone: audit `cskh.reveal`, 60 / giờ) rồi hiện số lớn với
// nút Gọi ngay (liên kết tel:), Sao chép, và "Ghi kết quả" để chuyển sang hộp thoại kết quả. SĐT không nằm trong bảng.
// Form mount lại mỗi lần mở: mỗi lần mở là một lần xem số được ghi nhật ký.
import type { CskhItem } from '@hp/core';
import { Copy, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { revealCskhPhoneAction } from '../actions';

type Props = { item: CskhItem; open: boolean; onOpenChange: (open: boolean) => void; onRecord: () => void };

export function CskhCallDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <CallBody {...props} /> : null}
    </Dialog>
  );
}

function CallBody({ item, onOpenChange, onRecord }: Props) {
  const t = useTranslations('admin.cskh');
  const tCommon = useTranslations('common.actions');
  const errorText = useErrorText();
  const toast = useToast();
  const name = item.user_name ?? t('unknown_user');
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void revealCskhPhoneAction({ requestId: item.request_id, party: item.party }).then((r) => {
      if (!alive) return;
      if (r.ok) setPhone(r.data);
      else setError(r.code);
    });
    return () => {
      alive = false;
    };
  }, [item.request_id, item.party]);

  const copy = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.show(t('call.copied'));
    } catch {
      toast.show(t('call.copy_failed'), 'error');
    }
  };

  return (
    <DialogContent className="sm:max-w-md" closeLabel={tCommon('close')}>
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t('call.title', { name })}</DialogTitle>
          <DialogDescription>{t('call.hint')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
          <span className="text-sm text-muted">{t('call.number')}</span>
          {error ? (
            <p role="alert" className="text-md text-danger">
              {errorText(error)}
            </p>
          ) : phone ? (
            <span className="text-2xl font-bold text-fg tabular-nums">{phone}</span>
          ) : (
            <Skeleton className="h-8 w-40" aria-hidden />
          )}
        </div>

        {phone ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild>
                <a href={`tel:${phone}`}>
                  <Phone strokeWidth={1.75} aria-hidden />
                  {t('call.call_now')}
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={() => void copy()}>
                <Copy strokeWidth={1.75} aria-hidden />
                {t('call.copy')}
              </Button>
            </div>
            <p className="text-sm text-muted">{t('call.after')}</p>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('call.close')}
          </Button>
          <Button type="button" onClick={onRecord}>
            {t('call.record')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
