// Người dùng nhìn từ admin: họ tên (staff) + tên rút gọn, SĐT đã che, tuổi tài khoản, vai trò, tình trạng, huy hiệu.
// Dùng ở huy hiệu / người dùng. Chữ qua next-intl (server lẫn client đều dùng được).
import type { AdminPerson } from '@hp/core';
import { formatRelative, type Locale } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { Link } from '@/i18n/navigation';

export function PersonName({ person, link = true }: { person: AdminPerson; link?: boolean }) {
  const t = useTranslations('admin.users');
  const name = person.full_name || person.display_name || t('no_name');
  return (
    <span className="flex min-w-0 flex-col">
      {link ? (
        <Link href={`/admin/users/${person.id}`} className="truncate font-medium text-fg underline-offset-4 hover:text-primary hover:underline">
          {name}
        </Link>
      ) : (
        <span className="truncate font-medium text-fg">{name}</span>
      )}
      <span className="truncate text-sm text-muted">{person.phone_masked ?? t('no_phone')}</span>
    </span>
  );
}

export function PersonSummary({ person, locale, now }: { person: AdminPerson; locale: Locale; now: number }) {
  const t = useTranslations('admin.users');
  const tRole = useTranslations('admin.role');
  const tBadge = useTranslations('listing.owner_badge');
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface-2 p-4 text-md sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <dt className="text-sm text-muted">{t('field.name')}</dt>
        <dd className="font-medium text-fg">{person.full_name || t('no_name')}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-sm text-muted">{t('field.phone')}</dt>
        <dd className="text-fg tabular-nums">{person.phone_masked ?? t('no_phone')}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-sm text-muted">{t('field.joined')}</dt>
        <dd className="text-fg">{formatRelative(person.created_at, locale, new Date(now))}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-sm text-muted">{t('field.state')}</dt>
        <dd className="flex flex-wrap gap-2">
          <StatusBadge kind="user" status={person.state} label={t(`state.${person.state}`)} />
          {person.role !== 'user' ? <Badge tone="primary">{tRole(person.role)}</Badge> : null}
        </dd>
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <dt className="text-sm text-muted">{t('field.badges')}</dt>
        <dd className="flex flex-wrap gap-2">
          {person.badges.length ? person.badges.map((b) => <Badge key={b} tone="success">{tBadge(b)}</Badge>) : <span className="text-muted">{t('no_badges')}</span>}
        </dd>
      </div>
    </dl>
  );
}
