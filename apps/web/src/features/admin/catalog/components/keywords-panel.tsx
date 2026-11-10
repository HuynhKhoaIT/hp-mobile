'use client';

// Tab từ khoá cấm (chỉ admin): thêm từ khoá (2–60 ký tự chữ / số, so khớp bỏ dấu), hành động "Từ chối ngay" / "Đưa vào
// hàng chờ", giới hạn theo danh mục (bỏ trống = mọi danh mục); đổi hành động; gỡ (xác nhận). Audit `keyword.*` do trigger.
import { type AdminKeyword, KEYWORD_ACTIONS, type KeywordAction } from '@hp/core';
import { LISTING_CATEGORIES, type ListingCategory } from '@hp/shared';
import { Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAction } from '../../lib/use-admin-action';
import { createKeywordAction, deleteKeywordAction, updateKeywordAction } from '../actions';

export function KeywordsPanel({ keywords, filtered }: { keywords: AdminKeyword[]; filtered: boolean }) {
  const t = useTranslations('admin.catalog.keywords');
  const tCat = useTranslations('common.category');
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, run } = useAdminAction();
  const [removing, setRemoving] = useState<AdminKeyword | null>(null);
  const [cats, setCats] = useState<ReadonlySet<ListingCategory>>(new Set());

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(
            () =>
              createKeywordAction({
                keyword: String(f.get('keyword') ?? ''),
                action: String(f.get('action') ?? 'review'),
                categories: cats.size ? LISTING_CATEGORIES.filter((c) => cats.has(c)) : null,
              }),
            {
              success: t('toast.created'),
              onDone: () => {
                formRef.current?.reset();
                setCats(new Set());
              },
            },
          );
        }}
      >
        <h2 className="text-md font-semibold text-fg">{t('add_title')}</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${id}-kw`} className="text-sm font-medium text-muted">
              {t('keyword')}
            </label>
            <Input id={`${id}-kw`} name="keyword" required minLength={2} maxLength={60} pattern="[\p{L}\p{N} ]+" aria-describedby={`${id}-kw-hint`} />
          </div>
          <div className="flex flex-col gap-1 sm:w-56">
            <label htmlFor={`${id}-action`} className="text-sm font-medium text-muted">
              {t('action')}
            </label>
            <select id={`${id}-action`} name="action" defaultValue="review" className={SELECT_CLASS}>
              {KEYWORD_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {t(`actions.${a}`)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {t('add')}
          </Button>
        </div>
        <p id={`${id}-kw-hint`} className="text-sm text-muted">
          {t('hint')}
        </p>
        <details className="text-md">
          <summary className="min-h-11 cursor-pointer py-2 font-medium text-fg">{t('categories_label', { count: cats.size })}</summary>
          <div className="flex flex-wrap gap-2 pt-2">
            {LISTING_CATEGORIES.map((c) => {
              const on = cats.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setCats((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(c);
                      else next.add(c);
                      return next;
                    })
                  }
                  className={
                    on
                      ? 'min-h-11 rounded-full border border-primary bg-primary-light px-4 text-sm font-medium text-primary'
                      : 'min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg hover:bg-surface-2'
                  }
                >
                  {tCat(c)}
                </button>
              );
            })}
          </div>
        </details>
      </form>

      {keywords.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState icon={Ban} title={filtered ? t('empty_filtered') : t('empty')} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full border-collapse text-left text-md">
            <caption className="sr-only">{t('table_label', { count: keywords.length })}</caption>
            <thead className="bg-surface-2 text-sm text-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">{t('keyword')}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t('action')}</th>
                <th scope="col" className="px-3 py-3 font-medium">{t('categories')}</th>
                <th scope="col" className="px-3 py-3 font-medium"><span className="sr-only">{t('col_actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => {
                const other: KeywordAction = k.action === 'reject' ? 'review' : 'reject';
                return (
                  <tr key={k.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium text-fg">{k.keyword}</td>
                    <td className="px-3 py-3">
                      <StatusBadge kind="keyword" status={k.action} label={t(`actions.${k.action}`)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-md flex-wrap gap-1">
                        {k.categories?.length ? k.categories.map((c) => <Badge key={c}>{tCat(c)}</Badge>) : <span className="text-sm text-muted">{t('all_categories')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(() => updateKeywordAction({ id: k.id, action: other, categories: k.categories }), { success: t('toast.updated') })
                          }
                        >
                          {t(`switch_to.${other}`)}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setRemoving(k)}>
                          {t('remove')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('confirm_remove', { keyword: removing?.keyword ?? '' })}
        description={t('confirm_remove_body')}
        confirmLabel={t('remove')}
        destructive
        pending={pending}
        onConfirm={() => {
          if (!removing) return;
          const kwId = removing.id;
          setRemoving(null);
          run(() => deleteKeywordAction({ id: kwId }), { success: t('toast.removed') });
        }}
      />
    </div>
  );
}
