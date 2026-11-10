'use client';

// Bảng nhật ký (admin): thời gian, người làm (tên rút gọn → hồ sơ admin), hành động, đối tượng, chi tiết meta (mở rộng).
// Lọc theo người làm / đối tượng bằng link trong bảng (?actor= / ?target=). Xuất CSV theo bộ lọc ngày + hành động.
import type { AdminPage, AuditEntry } from '@hp/core';
import { formatDate } from '@hp/shared';
import { Download, ScrollText } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { getPathname, Link } from '@/i18n/navigation';
import { hrefWith, type Query } from '../../lib/params';

const BASE = '/admin/audit';

function metaText(meta: AuditEntry['meta']): string {
  if (!meta || (typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length === 0)) return '';
  return JSON.stringify(meta);
}

export function AuditTable({ data, query }: { data: AdminPage<AuditEntry>; query: Query }) {
  const t = useTranslations('admin.audit');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const filtered = Boolean(query.from || query.to || query.action || query.actor || query.target);
  const exportQuery: Query = {};
  for (const k of ['from', 'to', 'action'] as const) if (query[k]) exportQuery[k] = query[k];
  const exportHref = getPathname({ href: { pathname: '/admin/audit/export', query: exportQuery }, locale });

  const columns: DataColumn<AuditEntry>[] = [
    {
      id: 'time',
      header: t('col.time'),
      cell: (e) => (
        <time dateTime={e.created_at} className="text-sm whitespace-nowrap text-fg tabular-nums">
          {formatDate(e.created_at, locale, 'datetime')}
        </time>
      ),
    },
    {
      id: 'actor',
      header: t('col.actor'),
      cell: (e) =>
        e.actor_id ? (
          <span className="flex flex-col gap-1 text-sm">
            <Link href={`/admin/users/${e.actor_id}`} className="text-fg underline-offset-4 hover:text-primary hover:underline">
              {e.actor_name ?? t('unknown_actor')}
            </Link>
            <Link href={hrefWith(BASE, query, { actor: e.actor_id })} className="text-muted underline-offset-4 hover:underline">
              {t('filter_actor')}
            </Link>
          </span>
        ) : (
          <span className="text-sm text-muted">{t('system')}</span>
        ),
    },
    { id: 'action', header: t('col.action'), cell: (e) => <Badge className="font-mono">{e.action}</Badge> },
    {
      id: 'target',
      header: t('col.target'),
      cell: (e) =>
        e.target_id ? (
          <span className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{e.target_type}</span>
            {e.target_type === 'profile' ? (
              <Link href={`/admin/users/${e.target_id}`} className="font-mono text-fg underline-offset-4 hover:text-primary hover:underline">
                {e.target_id.slice(0, 8)}
              </Link>
            ) : (
              <span className="font-mono text-fg" title={e.target_id}>
                {e.target_id.slice(0, 8)}
              </span>
            )}
            <Link href={hrefWith(BASE, query, { target: e.target_id })} className="text-muted underline-offset-4 hover:underline">
              {t('filter_target')}
            </Link>
          </span>
        ) : (
          <span className="text-sm text-muted">{e.target_type ?? '—'}</span>
        ),
    },
    {
      id: 'meta',
      header: t('col.meta'),
      cell: (e) => {
        const text = metaText(e.meta);
        if (!text) return <span className="text-sm text-muted">—</span>;
        return (
          <details className="max-w-md text-sm">
            <summary className="min-h-11 cursor-pointer py-2 text-muted">
              <span className="line-clamp-1 font-mono">{text}</span>
            </summary>
            <pre className="overflow-x-auto rounded-sm bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap text-fg">
              {JSON.stringify(e.meta, null, 2)}
            </pre>
          </details>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {query.actor ? (
            <Button asChild variant="outline" size="sm">
              <Link href={hrefWith(BASE, query, { actor: null })}>{t('clear_actor')}</Link>
            </Button>
          ) : null}
          {query.target ? (
            <Button asChild variant="outline" size="sm">
              <Link href={hrefWith(BASE, query, { target: null })}>{t('clear_target', { id: query.target.slice(0, 8) })}</Link>
            </Button>
          ) : null}
        </div>
        <Button asChild>
          <a href={exportHref} download>
            <Download strokeWidth={1.75} aria-hidden />
            {t('export')}
          </a>
        </Button>
      </div>
      <p className="text-sm text-muted">{t('export_hint')}</p>
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(e) => String(e.id)}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={<EmptyState icon={ScrollText} title={filtered ? t('empty_filtered') : t('empty')} />}
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
    </div>
  );
}
