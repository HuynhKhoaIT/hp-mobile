'use client';

// Tab Mini-app (chỉ admin): bật / tắt từng mini-app của super app + đổi thứ tự hiển thị ở Hub. Mini-app tắt bị ẩn khỏi Hub
// app / web, route trả 404 (dữ liệu đã đăng vẫn giữ). Bật / tắt có hộp xác nhận ghi rõ mini-app. Audit `mini_app.update` do trigger.
import type { AdminMiniApp } from '@hp/core';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { useAdminAction } from '../../lib/use-admin-action';
import { reorderMiniAppsAction, setMiniAppAction } from '../actions';

export function MiniAppsPanel({ miniApps }: { miniApps: AdminMiniApp[] }) {
  const t = useTranslations('admin.catalog.miniapps');
  const { pending, run } = useAdminAction();
  const [toggle, setToggle] = useState<AdminMiniApp | null>(null);
  const name = (code: AdminMiniApp['code']) => t(`names.${code}`);

  const move = (index: number, delta: -1 | 1) => {
    const codes = miniApps.map((m) => m.code);
    const target = index + delta;
    const a = codes[index];
    const b = codes[target];
    if (a === undefined || b === undefined) return;
    codes[index] = b;
    codes[target] = a;
    run(() => reorderMiniAppsAction({ codes }), { success: t('toast.reordered') });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-md text-muted">{t('hint')}</p>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full border-collapse text-left text-md">
          <caption className="sr-only">{t('table_label')}</caption>
          <thead className="bg-surface-2 text-sm text-muted">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">{t('col.order')}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t('col.name')}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t('col.code')}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t('col.status')}</th>
              <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">{t('col.actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {miniApps.map((m, i) => (
              <tr key={m.code} className="border-t border-border">
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || i === 0}
                      aria-label={t('up_a11y', { name: name(m.code) })}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp strokeWidth={1.75} aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || i === miniApps.length - 1}
                      aria-label={t('down_a11y', { name: name(m.code) })}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown strokeWidth={1.75} aria-hidden />
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-3 font-medium text-fg">{name(m.code)}</td>
                <td className="px-3 py-3 font-mono text-sm text-muted">{m.code}</td>
                <td className="px-3 py-3">
                  <StatusBadge kind="toggle" status={m.isEnabled ? 'on' : 'off'} label={m.isEnabled ? t('on') : t('off')} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end">
                    <Button size="sm" variant={m.isEnabled ? 'destructive' : 'outline'} disabled={pending} onClick={() => setToggle(m)}>
                      {m.isEnabled ? t('disable') : t('enable')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminConfirmDialog
        open={toggle !== null}
        onOpenChange={(o) => !o && setToggle(null)}
        title={toggle ? t(toggle.isEnabled ? 'confirm.off_title' : 'confirm.on_title', { name: name(toggle.code) }) : ''}
        description={toggle ? t(toggle.isEnabled ? 'confirm.off_body' : 'confirm.on_body') : undefined}
        confirmLabel={toggle ? (toggle.isEnabled ? t('disable') : t('enable')) : ''}
        destructive={toggle?.isEnabled}
        pending={pending}
        onConfirm={() => {
          if (!toggle) return;
          const { code, isEnabled } = toggle;
          setToggle(null);
          run(() => setMiniAppAction({ code, isEnabled: !isEnabled }), { success: t('toast.updated') });
        }}
      />
    </div>
  );
}
