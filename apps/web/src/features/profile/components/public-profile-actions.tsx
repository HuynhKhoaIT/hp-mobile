'use client';

// Hành động ở thẻ hồ sơ công khai (/u/[id]) — giống nút Báo cáo / Chặn trên header của app (apps/mobile/CLAUDE.md mục 10:
// "nút Báo cáo và Chặn ở mọi hồ sơ"). Dùng lại luồng có sẵn: ReportButton (khách → LoginDialog, intent "report") và
// useBlockAction + ConfirmDialog (features/report/use-report.ts). Chỉ là UI — RLS / RPC mới quyết định.
// - Hồ sơ của chính mình → dòng nhắc "người khác thấy như thế này" + link trang Tôi (không báo cáo / chặn chính mình).
// - Đã chặn → nhắc (tin + nhóm của họ bị ẩn với mình) + nút Bỏ chặn.
// Trang render ở server với phiên chưa biết (undefined): nút tắt tới khi đọc xong phiên — không lệch hydrate.
import { Ban, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { ReportButton } from '@/features/report/components/report-button';
import { useBlockAction } from '@/features/report/use-report';
import { Link } from '@/i18n/navigation';

export function PublicProfileActions({ userId: profileId, name }: { userId: string; name: string }) {
  const t = useTranslations();
  const viewer = useSessionUser();
  const block = useBlockAction({ id: profileId, name });

  if (viewer && viewer === profileId) {
    return (
      <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-primary-light p-3">
        <p className="min-w-0 flex-1 text-sm text-fg">{t('common.profile.own_notice')}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/toi">
            <UserRound strokeWidth={1.75} aria-hidden />
            {t('common.nav.me')}
          </Link>
        </Button>
      </div>
    );
  }

  const blockButton = (
    <Button
      type="button"
      variant="ghost"
      className="text-muted hover:text-danger"
      disabled={viewer === undefined || block.isPending}
      onClick={viewer ? block.ask : undefined}
    >
      <Ban strokeWidth={1.75} aria-hidden />
      {t('common.actions.block')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      {block.isBlocked ? (
        <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger/10 p-3">
          <p className="min-w-0 flex-1 text-sm text-fg">{t('common.profile.blocked_notice')}</p>
          <Button type="button" variant="outline" size="sm" disabled={block.isPending} onClick={block.unblock}>
            {t('common.block.unblock')}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ReportButton target="profile" targetId={profileId} label={t('common.actions.report')} userId={viewer} />
        {block.isBlocked ? null : viewer === null ? <LoginDialog trigger={blockButton} /> : blockButton}
      </div>
      <ConfirmDialog {...block.confirmProps} />
    </div>
  );
}
