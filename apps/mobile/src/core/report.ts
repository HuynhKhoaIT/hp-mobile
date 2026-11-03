// Báo cáo / chặn — dùng ở chi tiết tin, hồ sơ, chat (CLAUDE.md mục 10: "nút Báo cáo và Chặn ở mọi hồ sơ, tin, chat").
// Đặt ở core (không ở một feature) vì nhiều feature cùng dùng; dữ liệu qua @hp/core (useReport, useToggleBlock).
// Khách → đăng nhập trước. Kết quả báo bằng toast; lỗi → errors.<code>.
import { useBlockedIds, useReport, useToggleBlock } from '@hp/core/react';
import type { ReportReason, ReportTarget } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useErrorText } from '@/lib/errors';
import { requireAuth } from './auth';

/** State + hành động cho <ReportSheet>: `open()` (đăng nhập trước), `sheetProps` truyền thẳng vào sheet. */
export function useReportAction(target: { type: ReportTarget; id: string }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const report = useReport();
  const [isOpen, setOpen] = useState(false);

  const submit = (v: { reason: ReportReason; detail?: string }) =>
    report.mutate(
      { targetType: target.type, targetId: target.id, reason: v.reason, detail: v.detail },
      {
        onSuccess: (res) => {
          setOpen(false);
          toast.show(res.already ? t('report.already') : t('report.success'), 'success');
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      },
    );

  return {
    open: () => requireAuth(() => setOpen(true)),
    sheetProps: {
      open: isOpen,
      onClose: () => setOpen(false),
      target: target.type,
      loading: report.isPending,
      onSubmit: submit,
    },
  };
}

/** Chặn / bỏ chặn một người: `ask()` mở xác nhận (chặn) hoặc bỏ chặn ngay; `confirmProps` cho <ConfirmSheet>. */
export function useBlockAction(user: { id: string | null | undefined; name?: string | null }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
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
          toast.show(t(next ? 'block.success' : 'block.unblocked'), 'success');
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      },
    );
  };

  return {
    isBlocked,
    ask: () => requireAuth(() => (isBlocked ? run(false) : setOpen(true))),
    unblock: () => run(false),
    confirmProps: {
      open: isOpen,
      onClose: () => setOpen(false),
      title: t('block.title', { name: user.name || t('block.someone') }),
      body: t('block.body'),
      confirmLabel: t('block.confirm'),
      loading: toggle.isPending,
      onConfirm: () => run(true),
    },
  };
}
