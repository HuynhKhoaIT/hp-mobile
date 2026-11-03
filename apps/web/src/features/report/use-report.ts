'use client';

// Báo cáo / chặn — dùng ở chi tiết tin, chat (và hồ sơ khi có trang /u/[id]). Giống apps/mobile/src/core/report.ts:
// dữ liệu qua @hp/core/react (useReport, useBlockedIds, useToggleBlock); kết quả báo bằng toast; lỗi → errors.<code>.
// Khách: nơi gọi bọc nút bằng LoginDialog (web không mở dialog đăng nhập bằng hàm như app).
import { useBlockedIds, useReport, useToggleBlock } from '@hp/core/react';
import type { ReportReason, ReportTarget } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useToast } from '@/components/shared/toast';
import { useErrorText } from '@/features/auth/components/use-error-text';
import type { ReportDialogProps } from './components/report-dialog';

/** State + hành động cho <ReportDialog>: `open()`, `dialogProps` truyền thẳng vào dialog. */
export function useReportAction(target: { type: ReportTarget; id: string | null | undefined }) {
  const t = useTranslations('common.report');
  const errorText = useErrorText();
  const toast = useToast();
  const report = useReport();
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);

  const submit: ReportDialogProps['onSubmit'] = (v: { reason: ReportReason; detail?: string }) => {
    if (!target.id) return;
    report.mutate(
      { targetType: target.type, targetId: target.id, reason: v.reason, detail: v.detail },
      {
        onSuccess: (res) => {
          setOpen(false);
          toast.show(res.already ? t('already') : t('success'));
        },
        onError: (e) => toast.show(errorText(e.code), 'error'),
      },
    );
  };

  const dialogProps: ReportDialogProps = {
    open: isOpen,
    onOpenChange: setOpen,
    target: target.type,
    pending: report.isPending,
    onSubmit: submit,
  };
  return { open, dialogProps };
}

/** Chặn / bỏ chặn một người: `ask()` mở xác nhận (chặn) hoặc bỏ chặn ngay; `confirmProps` cho <ConfirmDialog>. */
export function useBlockAction(user: { id: string | null | undefined; name?: string | null }) {
  const t = useTranslations('common.block');
  const errorText = useErrorText();
  const toast = useToast();
  const blocked = useBlockedIds();
  const toggle = useToggleBlock();
  const [isOpen, setOpen] = useState(false);
  const isBlocked = !!user.id && !!blocked.data?.has(user.id);

  const run = (next: boolean) => {
    if (!user.id) return;
    toggle.mutate(
      { userId: user.id, next },
      {
        onSuccess: () => {
          setOpen(false);
          toast.show(t(next ? 'success' : 'unblocked'));
        },
        onError: (e) => toast.show(errorText(e.code), 'error'),
      },
    );
  };

  return {
    isBlocked,
    /** Đã tải danh sách chặn (chưa tải → nơi gọi dựa vào cờ của server, vd conversation.blocked_by_me). */
    known: blocked.data !== undefined,
    ask: () => (isBlocked ? run(false) : setOpen(true)),
    unblock: () => run(false),
    isPending: toggle.isPending,
    confirmProps: {
      open: isOpen,
      onOpenChange: setOpen,
      title: t('title', { name: user.name || t('someone') }),
      description: t('body'),
      confirmLabel: t('confirm'),
      destructive: true,
      pending: toggle.isPending,
      onConfirm: () => run(true),
    },
  };
}
