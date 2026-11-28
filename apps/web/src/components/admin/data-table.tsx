'use client';

// DataTable — bảng admin dùng chung (phân trang / lọc / sắp xếp ở SERVER, trạng thái nằm trên URL searchParams).
// - Cột: header + cell (render), `sort` = tên cột server nhận (bấm tiêu đề → ?sort=col | -col, về trang 1).
// - Chọn nhiều (ô đầu dòng + chọn cả trang) → thanh hành động hàng loạt `bulkActions(ids, clear)`.
// - Bàn phím: J / K chuyển dòng, X chọn / bỏ chọn dòng đang đứng, Enter mở dòng (`onOpen`). Không bắt phím khi đang gõ.
// - < 768px: danh sách THẺ GỌN như app: tiêu đề (cột `primary`, mặc định cột đầu) + nhãn trạng thái (cột `badge` / id status, state)
//   → 1–2 thông tin chính (`summary`, mặc định 2 cột kế tiếp) → "Xem thêm" (các cột còn lại) → thao tác (`actions`). Thay cho bảng
//   cuộn ngang; ≥ 768px: bảng (cột `desktopOnly` ẩn dưới 1024px).
// Không dùng TanStack Table (chưa cài — xem docs/plan/web.md 3l); API giữ gần để thay sau không đổi nơi gọi.
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from '@/i18n/navigation';
import { hrefWith, type Query } from '@/features/admin/lib/params';
import { cn } from '@/lib/utils';

export type DataColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Tên cột sắp xếp phía server (bật nút sắp xếp ở tiêu đề). */
  sort?: string;
  className?: string;
  /** Ẩn cột dưới 1024px (thông tin phụ). */
  desktopOnly?: boolean;
  /** Dạng thẻ (< 768px): cột làm tiêu đề thẻ. Mặc định cột đầu tiên. */
  primary?: boolean;
  /** Dạng thẻ: cột thao tác, đặt ở chân thẻ (cột có id `actions` tự tính là thao tác). */
  actions?: boolean;
  /** Dạng thẻ: cột hiện như nhãn trạng thái ở góc phải tiêu đề. Mặc định cột có id `status` / `state`. */
  badge?: boolean;
  /** Dạng thẻ: cột hiện ở dòng thông tin chính dưới tiêu đề (tối đa 2 cột). Mặc định 2 cột đầu sau tiêu đề; phần còn lại vào "Xem thêm". */
  summary?: boolean;
};

/** Số thông tin chính hiện sẵn trên thẻ (ngoài tiêu đề và nhãn trạng thái). */
const CARD_SUMMARY_MAX = 2;

/**
 * Một dòng dạng thẻ gọn cho màn hình nhỏ (như thẻ trong app): tiêu đề (cột chính) + nhãn trạng thái ở góc phải → 1–2 thông tin
 * chính cùng một dòng → "Xem thêm" (các cột còn lại, mỗi trường một hàng ngang) → hàng thao tác. Ô trả về rỗng bị bỏ.
 */
function RowCard<T>({
  row,
  columns,
  checked,
  selectable,
  active,
  checkLabel,
  moreLabel,
  onToggle,
}: {
  row: T;
  columns: DataColumn<T>[];
  checked: boolean;
  selectable: boolean;
  active: boolean;
  checkLabel: string;
  moreLabel: string;
  onToggle: (value: boolean) => void;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  const filled = (cols: DataColumn<T>[]) =>
    cols.map((col) => ({ col, node: col.cell(row) })).filter(({ node }) => node !== null && node !== undefined && node !== false);
  const isAction = (c: DataColumn<T>) => c.actions || c.id === 'actions';
  const badgeCol = rest.find((c) => !isAction(c) && (c.badge || (!rest.some((x) => x.badge) && (c.id === 'status' || c.id === 'state'))));
  const middle = rest.filter((c) => c !== badgeCol && !isAction(c));
  const flagged = middle.filter((c) => c.summary);
  const summaryCols = (flagged.length > 0 ? flagged : middle).slice(0, CARD_SUMMARY_MAX);
  const badge = badgeCol ? filled([badgeCol])[0] : undefined;
  const summary = filled(summaryCols);
  const details = filled(middle.filter((c) => !summaryCols.includes(c)));
  const actionCells = filled(rest.filter(isAction));
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 shadow-card transition-colors duration-150',
        checked || active ? 'border-primary bg-primary-light/50' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable ? <Checkbox checked={checked} onCheckedChange={(v) => onToggle(v === true)} aria-label={checkLabel} className="mt-1" /> : null}
        <div className="min-w-0 flex-1">{primary ? primary.cell(row) : null}</div>
        {badge ? <div className="shrink-0">{badge.node}</div> : null}
      </div>
      {summary.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {summary.map(({ col, node }, i) => (
            <span key={col.id} className="inline-flex min-w-0 items-center gap-2">
              {i > 0 ? <span aria-hidden>·</span> : null}
              <span className="sr-only">{col.header}: </span>
              {node}
            </span>
          ))}
        </div>
      ) : null}
      {details.length > 0 ? (
        <details className="group text-sm">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 font-medium text-primary outline-none marker:hidden focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            {moreLabel}
            <ChevronDown strokeWidth={1.75} className="size-4 transition-transform duration-150 group-open:rotate-180" aria-hidden />
          </summary>
          <dl className="mt-1 flex flex-col divide-y divide-border">
            {details.map(({ col, node }) => (
              <div key={col.id} className="flex items-start justify-between gap-3 py-2">
                <dt className="shrink-0 text-muted">{col.header}</dt>
                <dd className="ml-auto min-w-0 max-w-[70%] text-right text-fg">{node}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {actionCells.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {actionCells.map(({ col, node }) => (
            <div key={col.id}>{node}</div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

type Props<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  getRowId: (row: T) => string;
  /** Tên bảng cho trình đọc màn hình. */
  label: string;
  /** Đường dẫn trang (không locale) + query hiện tại — dựng link sắp xếp. */
  basePath: string;
  query: Query;
  selectable?: boolean;
  /** Nhãn ô chọn từng dòng ("Chọn báo cáo …"). */
  rowLabel?: (row: T) => string;
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;
  onOpen?: (row: T) => void;
  /** Dòng đang mở (tô đậm). */
  activeId?: string | null;
  /** Khung trống khi không có dòng. */
  empty?: ReactNode;
  /** Chữ "1–25 trong 120" ở thanh trên. */
  summary?: ReactNode;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  label,
  basePath,
  query,
  selectable = false,
  rowLabel,
  bulkActions,
  onOpen,
  activeId = null,
  empty,
  summary,
}: Props<T>) {
  const t = useTranslations('admin.table');
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [cursor, setCursor] = useState(-1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const ids = rows.map(getRowId);
  const selectedIds = ids.filter((id) => checked.has(id));
  const allChecked = ids.length > 0 && selectedIds.length === ids.length;
  const someChecked = selectedIds.length > 0;
  const clear = useCallback(() => setChecked(new Set()), []);

  const toggle = useCallback((id: string, value?: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // J / K / X / Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]') || rows.length === 0) return;
      const key = e.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        e.preventDefault();
        setCursor((c) => {
          const next = key === 'j' ? Math.min(c + 1, rows.length - 1) : Math.max(c - 1, 0);
          rowRefs.current[next]?.focus();
          return next;
        });
      } else if (key === 'x' && selectable && cursor >= 0) {
        const id = ids[cursor];
        if (id) {
          e.preventDefault();
          toggle(id);
        }
      } else if (key === 'enter' && onOpen && cursor >= 0 && e.target instanceof HTMLTableRowElement) {
        const row = rows[cursor];
        if (row) {
          e.preventDefault();
          onOpen(row);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, ids, onOpen, rows, selectable, toggle]);

  const sortValue = query.sort;
  const sortHref = (col: string) => {
    const next = sortValue === col ? `-${col}` : col;
    return hrefWith(basePath, query, { sort: next });
  };

  return (
    <div className="flex flex-col gap-3">
      {selectable || summary ? (
        <div
          className={cn(
            'flex min-h-14 flex-wrap items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-150',
            someChecked ? 'border-primary bg-primary-light' : 'border-border bg-surface',
          )}
        >
          {selectable && rows.length > 0 ? (
            <Checkbox
              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
              onCheckedChange={(v) => setChecked(v === true ? new Set(ids) : new Set())}
              aria-label={t('select_all')}
            />
          ) : null}
          <span className="flex-1 text-sm font-medium text-fg" aria-live="polite">
            {someChecked ? t('selected', { count: selectedIds.length }) : summary}
          </span>
          {someChecked && bulkActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {bulkActions(selectedIds, clear)}
            </div>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">{empty}</div>
      ) : (
        <>
        <ul aria-label={label} className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => {
            const id = getRowId(row);
            return (
              <RowCard
                key={id}
                row={row}
                columns={columns}
                checked={checked.has(id)}
                selectable={selectable}
                active={activeId === id}
                checkLabel={rowLabel ? rowLabel(row) : t('select_row')}
                moreLabel={t('more_details')}
                onToggle={(value) => toggle(id, value)}
              />
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto rounded-md border border-border bg-surface md:block">
          <table className="w-full min-w-full border-collapse text-left text-md">
            <caption className="sr-only">{label}</caption>
            <thead className="bg-surface-2 text-sm text-muted">
              <tr>
                {selectable ? (
                  <th scope="col" className="w-12 px-3 py-3">
                    <span className="sr-only">{t('select_col')}</span>
                  </th>
                ) : null}
                {columns.map((col) => {
                  const active = col.sort && (sortValue === col.sort || sortValue === `-${col.sort}`);
                  const desc = sortValue === `-${col.sort}`;
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined}
                      className={cn('px-3 py-3 font-medium whitespace-nowrap', col.desktopOnly && 'hidden lg:table-cell', col.className)}
                    >
                      {col.sort ? (
                        <Link
                          href={sortHref(col.sort)}
                          className="inline-flex min-h-11 items-center gap-1 rounded-sm outline-none hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {col.header}
                          {active ? (
                            desc ? (
                              <ArrowDown strokeWidth={1.75} className="size-4" aria-hidden />
                            ) : (
                              <ArrowUp strokeWidth={1.75} className="size-4" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown strokeWidth={1.75} className="size-4 opacity-60" aria-hidden />
                          )}
                          <span className="sr-only">{t('sort_by')}</span>
                        </Link>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const id = getRowId(row);
                const isChecked = checked.has(id);
                return (
                  <tr
                    key={id}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    tabIndex={i === cursor || (cursor < 0 && i === 0) ? 0 : -1}
                    onFocus={() => setCursor(i)}
                    aria-selected={selectable ? isChecked : undefined}
                    className={cn(
                      'border-t border-border align-top transition-colors duration-150 outline-none focus-visible:bg-primary-light/60',
                      isChecked && 'bg-primary-light/50',
                      activeId === id && 'bg-primary-light',
                    )}
                  >
                    {selectable ? (
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(v) => toggle(id, v === true)}
                          aria-label={rowLabel ? rowLabel(row) : t('select_row')}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-3 py-3', col.desktopOnly && 'hidden lg:table-cell', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
