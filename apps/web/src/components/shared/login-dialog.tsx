'use client';

// LoginDialog — khách bấm Liên hệ / Đăng tin / Tham gia / Lưu: mở đăng nhập tại chỗ, xong thì ở lại đúng trang
// (tải lại để header + dữ liệu theo phiên mới). Hành động `intent` chạy lại sau đăng nhập: thêm ở tuần 4–5.
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoginFlow } from '@/features/auth/components/login-flow';

export function LoginDialog({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('/');

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) setNext(`${window.location.pathname}${window.location.search}`);
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
