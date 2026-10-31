// Khung chung trang đăng nhập / MFA của admin: thương hiệu + "Quản trị", chỉ báo 2 bước (SĐT → mã xác thực), thẻ nội
// dung, ghi chú "chỉ dành cho staff" + dòng miễn trừ. Không header / footer marketing.
import { APP_NAME } from '@hp/shared';
import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export async function AdminAuthCard({ step, children }: { step: 1 | 2; children: ReactNode }) {
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const steps = [t('login.step_phone'), t('login.step_mfa')];
  return (
    <main className="flex min-h-dvh flex-col items-center bg-bg px-4 py-10 sm:justify-center">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
            <ShieldCheck strokeWidth={1.75} className="size-6" aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold text-fg">{APP_NAME}</span>
            <span className="text-xs font-medium tracking-wide text-muted uppercase">{t('brand.area')}</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <ol aria-label={t('login.step_label', { current: step, total: steps.length })} className="grid grid-cols-2 border-b border-border">
            {steps.map((label, i) => {
              const index = i + 1;
              const current = index === step;
              const done = index < step;
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium',
                    current ? 'border-primary text-primary' : done ? 'border-success text-fg' : 'border-transparent text-muted',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      current ? 'bg-primary text-on-primary' : done ? 'bg-success/15 text-success' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {index}
                  </span>
                  <span className="truncate">{label}</span>
                </li>
              );
            })}
          </ol>
          <div className="p-6">{children}</div>
        </div>

        <div className="flex flex-col gap-1 text-center text-sm text-muted">
          <p>{t('brand.staff_only')}</p>
          <p>{tCommon('disclaimer')}</p>
        </div>
      </div>
    </main>
  );
}
