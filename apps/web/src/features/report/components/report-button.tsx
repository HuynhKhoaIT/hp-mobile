'use client';

// Nút "Báo cáo" (vd chi tiết tin, người xem không phải chủ tin). Khách → LoginDialog (intent "report": sau đăng nhập tự mở
// lại dialog báo cáo đúng đối tượng). Đã đăng nhập → ReportDialog.
import type { ReportTarget } from '@hp/shared';
import { Flag } from 'lucide-react';
import { useEffect } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { useReportAction } from '../use-report';
import { ReportDialog } from './report-dialog';

export function ReportButton({
  target,
  targetId,
  label,
  userId,
}: {
  target: ReportTarget;
  targetId: string;
  label: string;
  /** undefined = đang kiểm tra phiên, null = khách. */
  userId: string | null | undefined;
}) {
  const report = useReportAction({ type: target, id: targetId });
  const { open } = report;

  // Vừa đăng nhập từ nút này → mở lại dialog (chạy sau commit, không đặt state đồng bộ trong effect).
  useEffect(() => {
    if (!userId || !takeLoginIntent('report', targetId)) return;
    const id = setTimeout(open, 0);
    return () => clearTimeout(id);
  }, [userId, targetId, open]);

  const button = (
    <Button
      type="button"
      variant="ghost"
      className="self-start text-muted hover:text-danger"
      disabled={userId === undefined}
      onClick={userId ? open : undefined}
    >
      <Flag strokeWidth={1.75} aria-hidden />
      {label}
    </Button>
  );

  return (
    <>
      {userId === null ? <LoginDialog trigger={button} intent={{ action: 'report', target: targetId }} /> : button}
      <ReportDialog {...report.dialogProps} />
    </>
  );
}
