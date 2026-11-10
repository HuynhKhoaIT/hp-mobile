'use client';

// Tab khu (chỉ admin): danh sách khu (cả khu đang ẩn) — tên, mã, thứ tự, hiện / ẩn; thêm khu (mã cố định sau khi tạo,
// toạ độ tâm để lọc khoảng cách), sửa tên / thứ tự / toạ độ, ẩn thay vì xoá (hồ sơ giữ khu đã chọn). Audit `site.*` do trigger.
import type { AdminSite } from '@hp/core';
import { MapPin, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAction } from '../../lib/use-admin-action';
import { createSiteAction, updateSiteAction } from '../actions';

export function SitesPanel({ sites }: { sites: AdminSite[] }) {
  const t = useTranslations('admin.catalog.sites');
  const { pending, run } = useAdminAction();
  const [editing, setEditing] = useState<AdminSite | 'new' | null>(null);
  const [toggle, setToggle] = useState<AdminSite | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-md text-muted">{t('hint')}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus strokeWidth={1.75} aria-hidden />
          {t('add')}
        </Button>
      </div>
      {sites.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState icon={MapPin} title={t('empty')} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full border-collapse text-left text-md">
            <caption className="sr-only">{t('table_label')}</caption>
            <thead className="bg-surface-2 text-sm text-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">{t('col.name')}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t('col.code')}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t('col.sort')}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t('col.status')}</th>
                <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">{t('col.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.code} className="border-t border-border">
                  <td className="px-3 py-3 font-medium text-fg">{s.name}</td>
                  <td className="px-3 py-3 font-mono text-sm text-muted">{s.code}</td>
                  <td className="px-3 py-3 tabular-nums">{s.sort_order}</td>
                  <td className="px-3 py-3">
                    <StatusBadge kind="toggle" status={s.is_active ? 'on' : 'off'} label={s.is_active ? t('active') : t('inactive')} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        {t('edit')}
                      </Button>
                      <Button size="sm" variant={s.is_active ? 'destructive' : 'outline'} disabled={pending} onClick={() => setToggle(s)}>
                        {s.is_active ? t('hide') : t('show')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmDialog
        open={toggle !== null}
        onOpenChange={(o) => !o && setToggle(null)}
        title={toggle ? t(toggle.is_active ? 'confirm.hide_title' : 'confirm.show_title', { name: toggle.name }) : ''}
        description={toggle ? t(toggle.is_active ? 'confirm.hide_body' : 'confirm.show_body') : undefined}
        confirmLabel={toggle ? (toggle.is_active ? t('hide') : t('show')) : ''}
        destructive={toggle?.is_active}
        pending={pending}
        onConfirm={() => {
          if (!toggle) return;
          const { code, is_active } = toggle;
          setToggle(null);
          run(() => updateSiteAction({ code, isActive: !is_active }), { success: t('toast.updated') });
        }}
      />

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? <SiteForm key={editing === 'new' ? 'new' : editing.code} site={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
    </div>
  );
}

function SiteForm({ site, onDone }: { site: AdminSite | null; onDone: () => void }) {
  const t = useTranslations('admin.catalog.sites');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const { pending, run } = useAdminAction();

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const str = (k: string) => String(f.get(k) ?? '').trim();
          const num = (k: string) => (str(k) === '' ? undefined : Number(str(k)));
          const sortOrder = num('sort') ?? 0;
          const lat = num('lat');
          const lng = num('lng');
          if (site) {
            run(
              () => updateSiteAction({ code: site.code, name: str('name'), sortOrder, ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}) }),
              { success: t('toast.updated'), onDone },
            );
          } else {
            run(() => createSiteAction({ code: str('code'), name: str('name'), sortOrder, lat, lng }), { success: t('toast.created'), onDone });
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{site ? t('form.edit_title', { name: site.name }) : t('form.new_title')}</DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        {site ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-code`}>{t('form.code')}</Label>
            <Input id={`${id}-code`} name="code" required pattern="[a-z0-9_]{2,40}" aria-describedby={`${id}-code-hint`} />
            <p id={`${id}-code-hint`} className="text-sm text-muted">
              {t('form.code_hint')}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-name`}>{t('form.name')}</Label>
          <Input id={`${id}-name`} name="name" required maxLength={80} defaultValue={site?.name ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-lat`}>{t('form.lat')}</Label>
            <Input id={`${id}-lat`} name="lat" type="number" step="any" min={-90} max={90} required={!site} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-lng`}>{t('form.lng')}</Label>
            <Input id={`${id}-lng`} name="lng" type="number" step="any" min={-180} max={180} required={!site} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-sort`}>{t('form.sort')}</Label>
            <Input id={`${id}-sort`} name="sort" type="number" step={1} defaultValue={site?.sort_order ?? 0} />
          </div>
        </div>
        {site ? <p className="text-sm text-muted">{t('form.coords_hint')}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {site ? t('form.save') : t('form.create')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
