'use client';

// LoginDialog — khách bấm Liên hệ / Đăng tin / Tham gia / Lưu: mở đăng nhập tại chỗ, xong thì ở lại đúng trang
// (tải lại để header + dữ liệu theo phiên mới). `intent` (Lưu tin, Hiện số…) được ghi lại khi mở dialog; component gọi
// takeLoginIntent() lúc mount sau khi tải lại để làm tiếp đúng hành động (login-intent.ts).
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoginFlow } from '@/features/auth/components/login-flow';
import { type LoginIntent, rememberLoginIntent } from './login-intent';

export function LoginDialog({ trigger, intent }: { trigger: ReactNode; intent?: LoginIntent }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('/');

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setNext(`${window.location.pathname}${window.location.search}`);
          if (intent) rememberLoginIntent(intent);
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t('auth.dialog.title')}</DialogTitle>
          <DialogDescription>{t('auth.dialog.description')}</DialogDescription>
        </DialogHeader>
        {open ? <LoginFlow next={next} onDone={() => window.location.reload()} /> : null}
      </DialogContent>
    </Dialog>
  );
}
