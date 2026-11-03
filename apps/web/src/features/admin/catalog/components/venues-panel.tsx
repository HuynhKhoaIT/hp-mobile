'use client';

// Tab sân (moderator+): bảng sân theo trạng thái (chờ duyệt cũ trước) — tên + môn + địa chỉ, khu, giá tham khảo, SĐT sân
// (số cơ sở, không phải PII người dùng), người góp, trạng thái; hành động: Duyệt / Từ chối (lý do) / Sửa / Ẩn / Hiện lại.
import { type AdminPage, type AdminSite, type AdminVenue, VENUE_SPORTS, type VenueSport } from '@hp/core';
import { formatMoney, formatRelative } from '@hp/shared';
import { MoreHorizontal, Store } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asLocale } from '@/features/listing/display';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { reviewVenueAction, setVenueHiddenAction, updateVenueAction } from '../actions';

const BASE = '/admin/catalog';

type Confirm = { kind: 'approve' | 'reject' | 'hide' | 'unhide'; venue: AdminVenue } | null;

export function VenuesPanel({ data, sites, query, now }: { data: AdminPage<AdminVenue>; sites: AdminSite[]; query: Query; now: number }) {
  const t = useTranslations('admin.catalog.venues');
  const tSport = useTranslations('group.sub_kind');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const { pending, run } = useAdminAction();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [editing, setEditing] = useState<AdminVenue | null>(null);
  const siteName = (code: string | null) => (code ? (sites.find((s) => s.code === code)?.name ?? code) : '—');
  const nowDate = new Date(now);

  const columns: DataColumn<AdminVenue>[] = [
    {
      id: 'name',
      header: t('col.name'),
      cell: (v) => (
        <div className="flex min-w-48 flex-col gap-1">
          <span className="font-medium text-fg">{v.name}</span>
          <span className="flex flex-wrap gap-1">
            {v.sports.map((s) => (
              <Badge key={s}>{tSport(s)}</Badge>
            ))}
          </span>
          {v.address_text ? <span className="text-sm text-muted">{v.address_text}</span> : null}
        </div>
      ),
    },
    { id: 'site', header: t('col.site'), desktopOnly: true, cell: (v) => <span className="text-sm">{siteName(v.site)}</span> },
    {
      id: 'price',
      header: t('col.price'),
      desktopOnly: true,
      cell: (v) => <span className="text-sm whitespace-nowrap">{v.price_ref !== null ? t('per_hour', { price: formatMoney(v.price_ref, locale) }) : '—'}</span>,
    },
    { id: 'phone', header: t('col.phone'), desktopOnly: true, cell: (v) => <span className="text-sm tabular-nums">{v.phone ?? '—'}</span> },
    {
      id: 'by',
      header: t('col.created_by'),
      cell: (v) => (
        <span className="flex flex-col text-sm">
          <span className="text-fg">{v.creator_name ?? t('unknown')}</span>
          <time dateTime={v.created_at} className="text-muted">
            {formatRelative(v.created_at, locale, nowDate)}
          </time>
        </span>
      ),
    },
    {
      id: 'status',
      header: t('col.status'),
      cell: (v) => (
        <div className="flex max-w-xs flex-col gap-1">
          {v.deleted_at ? <Badge>{t('hidden')}</Badge> : <StatusBadge kind="venue" status={v.status} label={t(`status.${v.status}`)} />}
          {v.reject_reason ? <span className="line-clamp-2 text-xs text-muted">{v.reject_reason}</span> : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (v) => (
        <div className="flex items-center gap-1">
          {v.status === 'pending' && !v.deleted_at ? (
            <Button size="sm" disabled={pending} onClick={() => setConfirm({ kind: 'approve', venue: v })}>
              {t('approve')}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('actions_for', { name: v.name })} disabled={pending}>
                <MoreHorizontal strokeWidth={1.75} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {v.status !== 'approved' && !v.deleted_at ? (
                <DropdownMenuItem onSelect={() => setConfirm({ kind: 'approve', venue: v })}>{t('approve')}</DropdownMenuItem>
              ) : null}
              {v.status !== 'rejected' && !v.deleted_at ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: 'reject', venue: v })}>
                  {t('reject')}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setEditing(v)}>{t('edit')}</DropdownMenuItem>
              {v.deleted_at ? (
                <DropdownMenuItem onSelect={() => setConfirm({ kind: 'unhide', venue: v })}>{t('unhide')}</DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: 'hide', venue: v })}>
                  {t('hide')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const c = confirm;
  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(v) => v.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={<EmptyState icon={Store} title={t('empty_title')} description={t('empty_body')} />}
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />

      <AdminConfirmDialog
        open={c !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={c ? t(`confirm.${c.kind}_title`, { name: c.venue.name }) : ''}
        description={c ? t(`confirm.${c.kind}_body`) : undefined}
        confirmLabel={c ? t(c.kind) : ''}
        destructive={c?.kind === 'reject' || c?.kind === 'hide'}
        pending={pending}
        note={c?.kind === 'reject' ? { label: t('reject_reason'), hint: t('reject_hint'), required: true, max: 200 } : undefined}
        onConfirm={({ note }) => {
          if (!c) return;
          setConfirm(null);
          const id = c.venue.id;
          if (c.kind === 'approve' || c.kind === 'reject') {
            run(() => reviewVenueAction({ id, approve: c.kind === 'approve', rejectReason: note || undefined }), { success: t(`toast.${c.kind}`) });
          } else {
            run(() => setVenueHiddenAction({ id, hidden: c.kind === 'hide' }), { success: t(`toast.${c.kind}`) });
          }
        }}
      />

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? <VenueForm key={editing.id} venue={editing} sites={sites} onDone={() => setEditing(null)} /> : null}
      </Dialog>
    </div>
  );
}

function VenueForm({ venue, sites, onDone }: { venue: AdminVenue; sites: AdminSite[]; onDone: () => void }) {
  const t = useTranslations('admin.catalog.venues');
  const tSport = useTranslations('group.sub_kind');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const { pending, run } = useAdminAction();
  const [sports, setSports] = useState<ReadonlySet<VenueSport>>(new Set(venue.sports));

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const str = (k: string) => String(f.get(k) ?? '').trim();
          run(
            () =>
              updateVenueAction({
                id: venue.id,
                name: str('name'),
                sports: VENUE_SPORTS.filter((s) => sports.has(s)),
                site: str('site') || null,
                addressText: str('address') || null,
                priceRef: str('price') === '' ? null : Number(str('price')),
                phone: str('phone') || null,
              }),
            { success: t('toast.updated'), onDone },
          );
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('form.title', { name: venue.name })}</DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-name`}>{t('form.name')}</Label>
          <Input id={`${id}-name`} name="name" defaultValue={venue.name} required minLength={2} maxLength={120} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-md font-medium text-fg">{t('form.sports')}</legend>
          <div className="flex flex-wrap gap-3">
            {VENUE_SPORTS.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-2">
                <Checkbox
                  checked={sports.has(s)}
                  onCheckedChange={(v) =>
                    setSports((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(s);
                      else next.delete(s);
                      return next;
                    })
                  }
                />
                {tSport(s)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-site`}>{t('form.site')}</Label>
            <select id={`${id}-site`} name="site" defaultValue={venue.site ?? ''} className={SELECT_CLASS}>
              <option value="">—</option>
              {sites.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-price`}>{t('form.price')}</Label>
            <Input id={`${id}-price`} name="price" type="number" inputMode="numeric" min={0} step={1000} defaultValue={venue.price_ref ?? ''} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-address`}>{t('form.address')}</Label>
          <Input id={`${id}-address`} name="address" defaultValue={venue.address_text ?? ''} maxLength={200} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-phone`}>{t('form.phone')}</Label>
          <Input id={`${id}-phone`} name="phone" type="tel" defaultValue={venue.phone ?? ''} maxLength={20} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={pending || sports.size === 0}>
            {t('form.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
