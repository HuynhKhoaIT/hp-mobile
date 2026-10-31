'use client';

// Khung khu quản trị: thanh bên (≥ 1024px, thu gọn được về dạng chỉ icon, nhớ bằng cookie) + thanh trên (tài khoản staff,
// vai trò, giao diện, ngôn ngữ, đăng xuất). < 1024px: thanh bên thành tấm trượt (Sheet) mở bằng nút menu.
// Không header / footer marketing, không bottom nav người dùng. Transition 150ms, không animation trang trí.
import { APP_NAME } from '@hp/shared';
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ADMIN_NAV, type AdminNavItem } from '../nav';
import { hasRole, type StaffRole } from '../roles';
import { StaffMenu } from './staff-menu';

/** Cookie nhớ trạng thái thu gọn thanh bên (layout đọc ở server để không nhấp nháy khi tải trang). */
export const SIDEBAR_COOKIE = 'hp_admin_sidebar';

type Props = {
  staff: { name: string; role: StaffRole };
  pendingCount: number | null;
  initialCollapsed: boolean;
  children: ReactNode;
};

function isActive(pathname: string, href: AdminNavItem['href']) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('admin.brand');
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <ShieldCheck strokeWidth={1.75} className="size-5" aria-hidden />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-md font-semibold text-fg">{APP_NAME}</span>
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{t('area')}</span>
        </span>
      )}
    </div>
  );
}

function NavList({
  role,
  pendingCount,
  collapsed = false,
  onNavigate,
}: {
  role: StaffRole;
  pendingCount: number | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((item) => hasRole(role, item.minRole));
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ key, href, Icon, badge }) => {
        const active = isActive(pathname, href);
        const count = badge === 'pending' && pendingCount ? pendingCount : 0;
        const label = t(key);
        return (
          <li key={key}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-md font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                active ? 'bg-primary-light text-primary' : 'text-fg hover:bg-surface-2',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon strokeWidth={1.75} className="size-5 shrink-0" aria-hidden />
              {collapsed ? <span className="sr-only">{label}</span> : <span className="flex-1 truncate">{label}</span>}
              {count > 0 ? (
                <span
                  aria-label={t('pending_count', { count })}
                  className={cn(
                    'inline-flex min-w-6 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-semibold text-on-accent',
                    collapsed && 'absolute top-1 right-1 min-w-5 px-1',
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BackToSite({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations('admin.nav');
  return (
    <Link
      href="/"
      title={collapsed ? t('back_to_site') : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition-colors duration-150 outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50',
        collapsed && 'justify-center px-0',
      )}
    >
      <ArrowLeft strokeWidth={1.75} className="size-5 shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">{t('back_to_site')}</span> : t('back_to_site')}
    </Link>
  );
}

export function AdminFrame({ staff, pendingCount, initialCollapsed, children }: Props) {
  const t = useTranslations('admin');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Cookie 1 năm, chỉ để nhớ giao diện (không nhạy cảm).
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Thanh bên desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-all duration-150 motion-reduce:transition-none lg:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'px-4')}>
          <Brand compact={collapsed} />
        </div>
        <nav aria-label={t('nav.label')} className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-3' : 'px-3')}>
          <NavList role={staff.role} pendingCount={pendingCount} collapsed={collapsed} />
        </nav>
        <div className={cn('flex flex-col gap-1 border-t border-border py-3', collapsed ? 'px-3' : 'px-3')}>
          <BackToSite collapsed={collapsed} />
          <Button
            type="button"
            variant="ghost"
            onClick={toggleCollapsed}
            title={collapsed ? t('nav.expand') : undefined}
            className={cn('justify-start gap-3 px-3 text-sm text-muted', collapsed && 'justify-center px-0')}
          >
            {collapsed ? <PanelLeftOpen strokeWidth={1.75} aria-hidden /> : <PanelLeftClose strokeWidth={1.75} aria-hidden />}
            {collapsed ? <span className="sr-only">{t('nav.expand')}</span> : t('nav.collapse')}
          </Button>
        </div>
      </aside>

      {/* Tấm trượt cho điện thoại / tablet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" closeLabel={t('nav.close_menu')} className="lg:hidden">
          <div className="flex h-16 items-center border-b border-border px-4 pr-14">
            <Brand />
          </div>
          <SheetTitle className="sr-only">{t('nav.label')}</SheetTitle>
          <SheetDescription className="sr-only">{t('brand.staff_only')}</SheetDescription>
          <nav aria-label={t('nav.label')} className="flex-1 overflow-y-auto px-3 py-4">
            <NavList role={staff.role} pendingCount={pendingCount} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="border-t border-border px-3 py-3 pb-safe">
            <BackToSite />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface px-2 sm:px-4 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t('nav.open_menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu strokeWidth={1.75} />
          </Button>
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <span className="ml-1 truncate text-md font-semibold text-fg lg:hidden">{t('brand.area')}</span>
          <div className="flex-1" />
          <StaffMenu name={staff.name} role={staff.role} />
        </header>
        <main id="admin-main" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
