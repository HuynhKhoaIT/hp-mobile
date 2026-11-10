'use client';

// Thao tác trên một người dùng (trang chi tiết). Hiện theo vai trò người xem — chỉ là giao diện, action kiểm lại ở server:
//   moderator+: khoá tạm 1 / 3 / 7 / 30 ngày, mở khoá, sửa huy hiệu · admin: cấm vĩnh viễn / bỏ cấm, đổi vai trò.
// Không thao tác trên chính mình; moderator không thao tác trên staff khác. Mọi hành động qua ConfirmDialog ghi rõ đối tượng.
import { type AdminUserDetail, SUSPEND_DAYS, type SuspendDays } from '@hp/core';
import { BADGES, type Badge, ROLES, type Role } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { StaffRole } from '../../roles';
import { useAdminAction } from '../../lib/use-admin-action';
import { setUserBadgesAction, setUserBannedAction, setUserRoleAction, suspendUserAction } from '../actions';

type Confirm =
  | { kind: 'suspend'; days: SuspendDays }
  | { kind: 'unsuspend' }
  | { kind: 'ban' }
  | { kind: 'unban' }
  | { kind: 'role'; role: Role }
  | { kind: 'badges'; badges: Badge[] }
  | null;


export function UserActions({ user, viewer }: { user: AdminUserDetail; viewer: { id: string; role: StaffRole } }) {
  const t = useTranslations('admin.users');
  const tRole = useTranslations('admin.role');
  const tBadge = useTranslations('listing.owner_badge');
  const id = useId();
  const { pending, run } = useAdminAction();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [days, setDays] = useState<SuspendDays>(7);
  const [role, setRole] = useState<Role>(user.role);
  const [badges, setBadges] = useState<ReadonlySet<Badge>>(new Set(user.badges));

  const isAdmin = viewer.role === 'admin';
  const name = user.full_name || user.display_name || t('no_name');

  if (user.id === viewer.id) return <Notice text={t('actions.self')} />;
  if (!isAdmin && user.role !== 'user') return <Notice text={t('actions.staff_target')} />;
  if (user.state === 'deleted') return <Notice text={t('actions.deleted')} />;

  const badgesChanged = badges.size !== user.badges.length || user.badges.some((b) => !badges.has(b));

  const execute = (c: NonNullable<Confirm>) => {
    setConfirm(null);
    const base = { userId: user.id };
    switch (c.kind) {
      case 'suspend':
        return run(() => suspendUserAction({ ...base, days: c.days }), { success: t('toast.suspended', { name, count: c.days }) });
      case 'unsuspend':
        return run(() => suspendUserAction({ ...base, days: null }), { success: t('toast.unsuspended', { name }) });
      case 'ban':
        return run(() => setUserBannedAction({ ...base, banned: true }), { success: t('toast.banned', { name }) });
      case 'unban':
        return run(() => setUserBannedAction({ ...base, banned: false }), { success: t('toast.unbanned', { name }) });
      case 'role':
        return run(() => setUserRoleAction({ ...base, role: c.role }), { success: t('toast.role', { name, role: tRole(c.role) }) });
      case 'badges':
        return run(() => setUserBadgesAction({ ...base, badges: c.badges }), { success: t('toast.badges', { name }) });
    }
  };

  const confirmText = (c: NonNullable<Confirm>) => {
    switch (c.kind) {
      case 'suspend':
        return { title: t('confirm.suspend_title', { name, count: c.days }), body: t('confirm.suspend_body'), label: t('confirm.suspend_cta', { count: c.days }), destructive: true };
      case 'unsuspend':
        return { title: t('confirm.unsuspend_title', { name }), body: t('confirm.unsuspend_body'), label: t('confirm.unsuspend_cta'), destructive: false };
      case 'ban':
        return { title: t('confirm.ban_title', { name }), body: t('confirm.ban_body'), label: t('confirm.ban_cta'), destructive: true };
      case 'unban':
        return { title: t('confirm.unban_title', { name }), body: t('confirm.unban_body'), label: t('confirm.unban_cta'), destructive: false };
      case 'role':
        return {
          title: t('confirm.role_title', { name, role: tRole(c.role) }),
          body: t('confirm.role_body'),
          label: t('confirm.role_cta', { role: tRole(c.role) }),
          destructive: c.role !== 'user',
        };
      case 'badges':
        return { title: t('confirm.badges_title', { name }), body: t('confirm.badges_body'), label: t('confirm.badges_cta'), destructive: false };
    }
  };
  const text = confirm ? confirmText(confirm) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Khoá tạm */}
      <Section title={t('actions.suspend_title')} hint={t('actions.suspend_hint')}>
        {user.state === 'suspended' ? (
          <Button variant="outline" disabled={pending} onClick={() => setConfirm({ kind: 'unsuspend' })}>
            {t('actions.unsuspend')}
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1 sm:w-48">
              <label htmlFor={`${id}-days`} className="text-sm font-medium text-muted">
                {t('actions.days_label')}
              </label>
              <select id={`${id}-days`} className={SELECT_CLASS} value={days} onChange={(e) => setDays(Number(e.target.value) as SuspendDays)}>
                {SUSPEND_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {t('actions.days', { count: d })}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="destructive" disabled={pending || user.state === 'banned'} onClick={() => setConfirm({ kind: 'suspend', days })}>
              {t('actions.suspend')}
            </Button>
          </div>
        )}
      </Section>

      {/* Huy hiệu */}
      <Section title={t('actions.badges_title')} hint={t('actions.badges_hint')}>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('actions.badges_title')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BADGES.map((b) => (
              <label
                key={b}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-md transition-colors duration-150',
                  badges.has(b) ? 'border-primary bg-primary-light' : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <Checkbox
                  checked={badges.has(b)}
                  onCheckedChange={(v) =>
                    setBadges((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(b);
                      else next.delete(b);
                      return next;
                    })
                  }
                />
                {tBadge(b)}
              </label>
            ))}
          </div>
          <div>
            <Button disabled={pending || !badgesChanged} onClick={() => setConfirm({ kind: 'badges', badges: BADGES.filter((b) => badges.has(b)) })}>
              {t('actions.save_badges')}
            </Button>
          </div>
        </fieldset>
      </Section>

      {/* Chỉ admin */}
      {isAdmin ? (
        <>
          <Section title={t('actions.ban_title')} hint={t('actions.ban_hint')}>
            {user.state === 'banned' ? (
              <Button variant="outline" disabled={pending} onClick={() => setConfirm({ kind: 'unban' })}>
                {t('actions.unban')}
              </Button>
            ) : (
              <Button variant="destructive" disabled={pending} onClick={() => setConfirm({ kind: 'ban' })}>
                {t('actions.ban')}
              </Button>
            )}
          </Section>
          <Section title={t('actions.role_title')} hint={t('actions.role_hint')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1 sm:w-56">
                <label htmlFor={`${id}-role`} className="text-sm font-medium text-muted">
                  {t('actions.role_label')}
                </label>
                <select id={`${id}-role`} className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {tRole(r)}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" disabled={pending || role === user.role} onClick={() => setConfirm({ kind: 'role', role })}>
                {t('actions.change_role')}
              </Button>
            </div>
          </Section>
        </>
      ) : (
        <p className="text-sm text-muted">{t('actions.admin_only_note')}</p>
      )}

      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={text?.title ?? ''}
        description={text?.body}
        confirmLabel={text?.label ?? ''}
        destructive={text?.destructive}
        pending={pending}
        onConfirm={() => confirm && execute(confirm)}
      />
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-md font-semibold text-fg">{title}</h3>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border p-4 text-md text-muted">{text}</p>;
}
