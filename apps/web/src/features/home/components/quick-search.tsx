// "Tìm nhanh" (docs/design/home.md §4.6, §10): chip cuộn ngang cao 40 (vùng chạm 48), chấm màu dịch vụ bên trái chữ.
// Mỗi chip = link danh sách của tính năng với bộ lọc trên URL (shortcuts.ts). Server Component — chạy khi tắt JS.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { HOME_SHORTCUT_LINKS } from '../shortcuts';

export async function QuickSearch() {
  const t = await getTranslations('common.home');
  return (
    <section aria-labelledby="home-shortcuts" className="flex flex-col gap-3">
      <h2 id="home-shortcuts" className="text-lg font-semibold text-fg">
        {t('shortcuts_title')}
      </h2>
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {HOME_SHORTCUT_LINKS.map((s) => (
          <li key={s.id} className="shrink-0">
            <Link
              href={s.href}
              className={cn(
                'relative inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium whitespace-nowrap text-fg outline-none transition-colors',
                'after:absolute after:inset-x-0 after:-inset-y-1 hover:bg-surface-2 active:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            >
              <span aria-hidden className={cn('size-2 shrink-0 rounded-full', s.dot)} />
              {t(`shortcut.${s.id}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
