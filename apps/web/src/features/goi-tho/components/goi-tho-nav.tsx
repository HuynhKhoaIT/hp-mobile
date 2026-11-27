'use client';

// Header + dải tab của mini-app Gọi thợ (màu riêng data-app-theme="goi-tho", gradient from-app-from → to-app-to): tên + dòng
// phụ, rồi 3 tab — Việc quanh bạn · Của tôi (yêu cầu + báo giá) · Tin nhắn — và nút cam "Đăng việc" (khách → /goi-tho/dang-yeu-cau
// do proxy.ts chuyển sang đăng nhập). Tab đang mở: aria-current="page". Điều hướng bằng link thật (chạy được khi tắt JS).
import { Hammer, MessageSquare, Plus, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { GOI_THO_PATHS } from '../trades';

const TABS = [
  { href: GOI_THO_PATHS.home, key: 'home', Icon: Hammer, match: (p: string) => p === GOI_THO_PATHS.home || p.startsWith(`${GOI_THO_PATHS.home}/yeu-cau`) },
  { href: GOI_THO_PATHS.mine, key: 'mine', Icon: UserRound, match: (p: string) => p.startsWith(GOI_THO_PATHS.mine) },
  { href: GOI_THO_PATHS.chat, key: 'chat', Icon: MessageSquare, match: (p: string) => p.startsWith(GOI_THO_PATHS.chat) },
] as const;

export function GoiThoNav() {
  const t = useTranslations('tho');
  const pathname = usePathname();

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-app-from to-app-to text-on-primary sm:rounded-b-xl">
      <HeaderDecor />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent shadow-fab">
            <Hammer strokeWidth={1.75} className="size-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-sm opacity-90">{t('subtitle')}</p>
          </div>
          <Link
            href={GOI_THO_PATHS.post}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-md font-semibold text-on-accent shadow-fab outline-none focus-visible:ring-3 focus-visible:ring-on-primary/60"
          >
            <Plus strokeWidth={1.75} className="size-5" aria-hidden />
            {t('tabs.new')}
          </Link>
        </div>
        <nav aria-label={t('title')}>
          <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {TABS.map(({ href, key, Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={key} className="flex">
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-md font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-on-primary/60',
                      active ? 'bg-surface text-primary' : 'text-on-primary hover:bg-on-primary/15',
                    )}
                  >
                    <Icon strokeWidth={1.75} className="size-5" aria-hidden />
                    {t(`tabs.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
