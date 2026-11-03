'use client';

// Xoá tài khoản (/toi/cai-dat, Nghị định 13 — giống app): nút đỏ → dialog ghi rõ hậu quả + ô gõ từ xác nhận
// (common.account.delete_confirm_word, "XOA") → useDeleteAccount (RPC delete_my_account: ẩn mọi nội dung ngay, xoá hẳn sau
// 30 ngày) → đăng xuất → về trang chủ (tải lại cả trang để xoá cache theo phiên) và hiện toast "Tài khoản đã được xoá".
// Toast qua sessionStorage vì trang tải lại (ACCOUNT_DELETED_FLAG, AccountDeletedToast đọc một lần; bọc try / catch).
import { signOut } from '@hp/core';
import { useDeleteAccount } from '@hp/core/react';
import type { Locale } from '@hp/shared';
import { Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';

const ACCOUNT_DELETED_FLAG = 'hp:account-deleted';

export function DeleteAccount() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  const toast = useToast();
  const remove = useDeleteAccount();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const word = t('common.account.delete_confirm_word');
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();

  const confirm = () =>
    remove.mutate(undefined, {
      onSuccess: async () => {
        await signOut(createBrowserClient());
        try {
          window.sessionStorage.setItem(ACCOUNT_DELETED_FLAG, '1');
        } catch {
          // Không ghi được: bỏ qua toast, vẫn về trang chủ.
        }
        window.location.assign(withLocale('/', locale));
      },
      onError: (e) => toast.show(errorText(e.code), 'error'),
    });

  return (
    <section aria-labelledby="delete-account" className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <h2 id="delete-account" className="text-lg font-semibold text-fg">
        {t('common.account.delete_title')}
      </h2>
      <p className="text-md text-muted">{t('common.account.delete_body')}</p>
      <Button type="button" variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden strokeWidth={1.75} />
        {t('common.account.delete_title')}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (remove.isPending) return;
          setOpen(value);
          if (!value) setTyped('');
        }}
      >
        <DialogContent closeLabel={t('common.actions.close')}>
          <DialogHeader>
            <DialogTitle>{t('common.account.delete_title')}</DialogTitle>
            <DialogDescription>{t('common.account.delete_body')}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmed && !remove.isPending) confirm();
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor={inputId} className="text-md font-medium text-fg">
                {t('common.account.delete_confirm_label')}
              </label>
              <Input
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => setOpen(false)}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={!confirmed || remove.isPending} aria-busy={remove.isPending || undefined}>
                {t('common.account.delete_action')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Đặt ở trang chủ: sau khi xoá tài khoản và tải lại, hiện toast một lần. */
export function AccountDeletedToast() {
  const t = useTranslations('common.account');
  const toast = useToast();
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ACCOUNT_DELETED_FLAG) !== '1') return;
      window.sessionStorage.removeItem(ACCOUNT_DELETED_FLAG);
    } catch {
      return;
    }
    toast.show(t('deleted'));
  }, [t, toast]);
  return null;
}
