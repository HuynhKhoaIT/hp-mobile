'use client';

// Bảng người dùng: họ tên + SĐT đã che (link chi tiết), vai trò, tình trạng (khoá tới ngày…), huy hiệu, tham gia, uy tín.
// Thao tác nằm ở trang chi tiết (/admin/users/[id]) để mỗi hành động có đủ ngữ cảnh + xác nhận.
import type { AdminPage, AdminUser } from '@hp/core';
import { formatDate, formatRelative } from '@hp/shared';
import { Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { Link, useRouter } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { PersonName } from './person-summary';

const BASE = '/admin/users';

export function UsersTable({ data, query, now }: { data: AdminPage<AdminUser>; query: Query; now: number }) {
  const t = useTranslations('admin.users');
  const tRole = useTranslations('admin.role');
  const tBadge = useTranslations('listing.owner_badge');
  const locale = asLocale(useLocale());
  const router = useRouter();
  const summary = useRangeSummary();
  const nowDate = new Date(now);
  const filtered = Boolean(query.q || query.role || query.state);

  const columns: DataColumn<AdminUser>[] = [
    { id: 'name', header: t('col.name'), sort: 'full_name', cell: (u) => <PersonName person={u} /> },
    {
      id: 'role',
      header: t('col.role'),
      cell: (u) => <Badge tone={u.role === 'user' ? 'neutral' : 'primary'}>{tRole(u.role)}</Badge>,
    },
    {
      id: 'state',
      header: t('col.state'),
      cell: (u) => (
        <div className="flex flex-col gap-1">
          <StatusBadge kind="user" status={u.state} label={t(`state.${u.state}`)} />
          {u.state === 'suspended' && u.banned_until ? (
            <span className="text-xs text-muted">{t('suspended_until', { date: formatDate(u.banned_until, locale, 'datetime') })}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'badges',
      header: t('col.badges'),
      desktopOnly: true,
      cell: (u) => (
        <div className="flex max-w-xs flex-wrap gap-1">
          {u.badges.length ? u.badges.map((b) => <Badge key={b}>{tBadge(b)}</Badge>) : <span className="text-sm text-muted">—</span>}
        </div>
      ),
    },
    {
      id: 'created',
      header: t('col.joined'),
      sort: 'created_at',
      cell: (u) => (
        <time dateTime={u.created_at} className="text-sm whitespace-nowrap text-muted">
          {formatRelative(u.created_at, locale, nowDate)}
        </time>
      ),
    },
    {
      id: 'reputation',
      header: t('col.reputation'),
      sort: 'reputation_score',
      desktopOnly: true,
      cell: (u) => <span className="text-sm text-fg tabular-nums">{u.reputation_score}</span>,
    },
    {
      id: 'open',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (u) => (
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/users/${u.id}`}>{t('open')}</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(u) => u.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        onOpen={(u) => router.push(`/admin/users/${u.id}`)}
        empty={
          <EmptyState
            icon={Users}
            title={filtered ? t('empty.filtered_title') : t('empty.title')}
            description={filtered ? t('empty.filtered_body') : undefined}
          />
        }
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
    </div>
  );
}
