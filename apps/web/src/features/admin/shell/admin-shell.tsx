// Khung khu quản trị phía server: kiểm phiên staff (aal2 + vai trò trong profiles) rồi dựng AdminFrame.
// proxy.ts đã chặn trước (khách → /admin/login, không staff → 403, aal1 → /admin/login/mfa); đây là lớp kiểm thứ hai
// (vd vai trò vừa bị thu nhưng JWT còn hạn). Đọc cookie / phiên → luôn nằm trong <Suspense> của layout.
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { redirect } from '@/i18n/navigation';
import { getPendingCounts } from '../moderation/queries';
import { getNavStats } from '../overview/queries';
import { requireStaff } from '../session';
import { AccessDeniedActions } from './access-denied-actions';
import { AdminFrame, SIDEBAR_COOKIE } from './admin-frame';

export async function AdminShell({ children }: { children: ReactNode }) {
  const check = await requireStaff();
  if (!check.ok) {
    const locale = await getLocale();
    if (check.code === 'auth_required') redirect({ href: '/admin/login', locale });
    if (check.code === 'mfa_required') redirect({ href: '/admin/login/mfa', locale });
    return <AccessDenied />;
  }
  const [counts, stats, cookieStore] = await Promise.all([getPendingCounts(), getNavStats(), cookies()]);
  return (
    <AdminFrame
      staff={{ name: check.staff.name, role: check.staff.role }}
      counts={{
        pending: counts?.pending,
        reports: stats?.reports_open,
        badges: stats?.badges_pending,
        venues: stats?.venues_pending,
      }}
      initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === 'collapsed'}
    >
      {children}
    </AdminFrame>
  );
}

async function AccessDenied() {
  const t = await getTranslations('admin.access');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div role="alert" className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold text-fg">{t('denied_title')}</h1>
        <p className="text-md text-muted">{t('denied_body')}</p>
        <AccessDeniedActions />
      </div>
    </main>
  );
}

/** Khung trống đúng hình (thanh bên + thanh trên + nội dung) khi đang kiểm phiên. */
export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-bg" aria-hidden>
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-border bg-surface p-4 lg:flex">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-4 h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-end border-b border-border bg-surface px-4">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex flex-col gap-4 p-4 lg:p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

