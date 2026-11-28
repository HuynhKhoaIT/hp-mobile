'use client';

// Bảng CSKH: mỗi dòng = (đơn Gọi thợ đã hoàn thành, một bên — khách hoặc thợ). Cột: đơn (link xem đơn) + thời gian hoàn thành,
// bên + tên, đã đánh giá trong app chưa, trạng thái chăm sóc (kênh, điểm, người xử lý), thao tác: Gọi (lấy SĐT có audit) /
// Nhắn Zalo (hộp thoại Zalo, loại tin CSKH) / Ghi kết quả. SĐT không nằm trong dữ liệu bảng — chỉ cờ has_phone.
import type { AdminPage, CskhItem } from '@hp/core';
import { formatDate, ZALO_CSKH_KINDS } from '@hp/shared';
import { ExternalLink, HeartHandshake, MessageCircle, Phone, SquarePen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { ZaloSendDialog } from '../../zalo/components/zalo-send-dialog';
import { CskhCallDialog } from './cskh-call-dialog';
import { CskhResultDialog } from './cskh-result-dialog';

const BASE = '/admin/cskh';

type Dialog = { kind: 'call' | 'zalo' | 'result'; item: CskhItem } | null;

export function CskhTable({ data, query }: { data: AdminPage<CskhItem>; query: Query }) {
  const t = useTranslations('admin.cskh');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const [dialog, setDialog] = useState<Dialog>(null);
  const filtered = Boolean(query.status || query.party || query.q);
  const nameOf = (i: CskhItem) => i.user_name ?? t('unknown_user');

  const columns: DataColumn<CskhItem>[] = [
    {
      id: 'order',
      header: t('col.order'),
      cell: (i) => (
        <div className="flex min-w-48 flex-col gap-1">
          <Link
            href={`/goi-tho/yeu-cau/${i.request_id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
          >
            <span className="line-clamp-2">{i.title}</span>
            <ExternalLink strokeWidth={1.75} className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">{t('action.open_request')}</span>
          </Link>
          {i.completed_at ? (
            <time dateTime={i.completed_at} className="text-sm text-muted tabular-nums">
              {t('completed', { time: formatDate(i.completed_at, locale, 'datetime') })}
            </time>
          ) : null}
        </div>
      ),
    },
    {
      id: 'person',
      header: t('col.person'),
      cell: (i) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={i.party === 'customer' ? 'primary' : 'neutral'}>{t(`party.${i.party}`)}</Badge>
          <span className="text-sm text-fg">{nameOf(i)}</span>
        </div>
      ),
    },
    {
      id: 'rating',
      header: t('col.rating'),
      desktopOnly: true,
      cell: (i) => <Badge tone={i.rated_in_app ? 'success' : 'neutral'}>{i.rated_in_app ? t('rated_yes') : t('rated_no')}</Badge>,
    },
    {
      id: 'status',
      header: t('col.status'),
      cell: (i) => (
        <div className="flex flex-col items-start gap-1 text-sm">
          <StatusBadge kind="cskh" status={i.status} label={t(`status.${i.status}`)} />
          {i.channel || i.score ? (
            <span className="text-muted">
              {[i.channel ? t(`channel.${i.channel}`) : null, i.score ? t('score', { score: i.score }) : null].filter(Boolean).join(' · ')}
            </span>
          ) : null}
          {i.handled_by_name && i.handled_at ? (
            <span className="text-xs text-muted">{t('handled_by', { name: i.handled_by_name, time: formatDate(i.handled_at, locale, 'datetime') })}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'result',
      header: t('col.result'),
      desktopOnly: true,
      cell: (i) => (i.note ? <p className="max-w-xs text-sm whitespace-pre-wrap text-fg">{i.note}</p> : <span className="text-sm text-muted">{t('no_result')}</span>),
    },
    {
      id: 'actions',
      header: t('col.actions'),
      cell: (i) => (
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!i.has_phone} title={i.has_phone ? undefined : t('no_phone')} onClick={() => setDialog({ kind: 'call', item: i })}>
            <Phone strokeWidth={1.75} aria-hidden />
            {t('action.call')}
          </Button>
          <Button size="sm" variant="outline" disabled={!i.has_phone} title={i.has_phone ? undefined : t('no_phone')} onClick={() => setDialog({ kind: 'zalo', item: i })}>
            <MessageCircle strokeWidth={1.75} aria-hidden />
            {t('action.zalo')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'result', item: i })}>
            <SquarePen strokeWidth={1.75} aria-hidden />
            {t('action.result')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(i) => `${i.request_id}:${i.party}`}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={<EmptyState icon={HeartHandshake} title={filtered ? t('empty_filtered') : t('empty')} />}
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />

      {dialog?.kind === 'call' ? (
        <CskhCallDialog
          open
          item={dialog.item}
          onOpenChange={(o) => !o && setDialog(null)}
          onRecord={() => setDialog({ kind: 'result', item: dialog.item })}
        />
      ) : null}
      {dialog?.kind === 'result' ? <CskhResultDialog open item={dialog.item} onOpenChange={(o) => !o && setDialog(null)} /> : null}
      {dialog?.kind === 'zalo' ? (
        <ZaloSendDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          recipient={{ type: 'user', id: dialog.item.user_id, name: nameOf(dialog.item), context: dialog.item.title }}
          defaultKind="service_followup"
          kinds={ZALO_CSKH_KINDS}
        />
      ) : null}
    </div>
  );
}
