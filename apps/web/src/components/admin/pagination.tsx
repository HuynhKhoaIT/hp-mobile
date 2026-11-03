// Pagination — trang trước / sau + "Trang x/y" bằng link (giữ bộ lọc trên URL). Dùng được ở server lẫn client.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { hrefWith, type Query } from '@/features/admin/lib/params';

export function Pagination({ basePath, query, page, pageCount }: { basePath: string; query: Query; page: number; pageCount: number }) {
  const t = useTranslations('admin.table');
  if (pageCount <= 1) return null;
  const prev = page > 1 ? hrefWith(basePath, query, { page: page - 1 }) : null;
  const next = page < pageCount ? hrefWith(basePath, query, { page: page + 1 }) : null;
  return (
    <nav aria-label={t('pagination')} className="flex items-center justify-between gap-2">
      {prev ? (
        <Button asChild variant="outline" size="sm">
          <Link href={prev}>
            <ChevronLeft strokeWidth={1.75} aria-hidden />
            {t('prev')}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft strokeWidth={1.75} aria-hidden />
          {t('prev')}
        </Button>
      )}
      <span className="text-sm text-muted">{t('page', { page, total: pageCount })}</span>
      {next ? (
        <Button asChild variant="outline" size="sm">
          <Link href={next}>
            {t('next')}
            <ChevronRight strokeWidth={1.75} aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('next')}
          <ChevronRight strokeWidth={1.75} aria-hidden />
        </Button>
      )}
    </nav>
  );
}

/** "1–25 trong 120" */
export function useRangeSummary() {
  const t = useTranslations('admin.table');
  return (page: number, pageSize: number, total: number) =>
    total === 0 ? t('none') : t('range', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total });
}
