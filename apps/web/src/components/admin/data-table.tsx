'use client';

// DataTable — bảng admin dùng chung (phân trang / lọc / sắp xếp ở SERVER, trạng thái nằm trên URL searchParams).
// - Cột: header + cell (render), `sort` = tên cột server nhận (bấm tiêu đề → ?sort=col | -col, về trang 1).
// - Chọn nhiều (ô đầu dòng + chọn cả trang) → thanh hành động hàng loạt `bulkActions(ids, clear)`.
// - Bàn phím: J / K chuyển dòng, X chọn / bỏ chọn dòng đang đứng, Enter mở dòng (`onOpen`). Không bắt phím khi đang gõ.
// - < 768px: danh sách THẺ như app (cột chính làm tiêu đề thẻ, các cột còn lại thành cặp nhãn / giá trị, cột thao tác ở chân thẻ)
//   thay vì bảng cuộn ngang; ≥ 768px: bảng (cột `desktopOnly` ẩn dưới 1024px).
// Không dùng TanStack Table (chưa cài — xem docs/plan/web.md 3l); API giữ gần để thay sau không đổi nơi gọi.
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
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
};

/** Một dòng dạng thẻ cho màn hình nhỏ: tiêu đề (cột chính) → cặp nhãn / giá trị → hàng thao tác. */
function RowCard<T>({
  row,
  columns,
  checked,
  selectable,
  active,
  checkLabel,
  onToggle,
}: {
  row: T;
  columns: DataColumn<T>[];
  checked: boolean;
  selectable: boolean;
  active: boolean;
  checkLabel: string;
  onToggle: (value: boolean) => void;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  // Ô trả về rỗng (null / false) bị bỏ: thẻ không vẽ nhãn trống hay hàng thao tác trống.
  const filled = (cols: DataColumn<T>[]) =>
    cols.map((col) => ({ col, node: col.cell(row) })).filter(({ node }) => node !== null && node !== undefined && node !== false);
  const isAction = (c: DataColumn<T>) => c.actions || c.id === 'actions';
  const actionCells = filled(rest.filter(isAction));
  const infoCells = filled(rest.filter((c) => !isAction(c)));
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 shadow-card transition-colors duration-150',
        checked || active ? 'border-primary bg-primary-light/50' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable ? <Checkbox checked={checked} onCheckedChange={(v) => onToggle(v === true)} aria-label={checkLabel} className="mt-1" /> : null}
        <div className="min-w-0 flex-1">{primary ? primary.cell(row) : null}</div>
      </div>
      {infoCells.length > 0 ? (
        <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          {infoCells.map(({ col, node }) => (
            <div key={col.id} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium text-muted">{col.header}</dt>
              <dd className="min-w-0 text-sm text-fg">{node}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actionCells.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
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
