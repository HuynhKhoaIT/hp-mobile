'use client';

// Góc phải thanh trên admin: tên + vai trò staff, menu giao diện (theo máy / sáng / tối), ngôn ngữ (vi / en — admin zh
// dùng chữ vi) và đăng xuất. Tên đầy đủ chỉ là của chính người đang đăng nhập.
import type { Locale } from '@hp/shared';
import { Check, ChevronDown, Languages, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useState, useSyncExternalStore, useTransition } from 'react';
import { Badge } from '@/components/shared/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from '@/i18n/navigation';
import { asLocale } from '@/features/listing/display';
import { signOutToAdminLogin } from '../auth/sign-out';
import type { StaffRole } from '../roles';

const THEMES = [
  { value: 'system', Icon: Monitor },
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
] as const;
const ADMIN_LOCALES: readonly Locale[] = ['vi', 'en'];
const noop = () => () => {};

/** "Phạm Thị Duyệt" → "PD" (chữ cái đầu họ + tên) cho ô đại diện. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function StaffMenu({ name, role }: { name: string; role: StaffRole }) {
  const t = useTranslations('admin');
  const tWeb = useTranslations('web.theme');
  const tCommon = useTranslations('common.locale');
  const locale = asLocale(useLocale());
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const roleLabel = t(`role.${role}`);

  const changeLocale = (next: Locale) =>
    startTransition(() => {
      router.replace(`${pathname}${window.location.search}`, { locale: next });
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-3 rounded-md px-2 text-left transition-colors duration-150 outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-surface-2"
          aria-label={`${t('topbar.account')}: ${name} (${roleLabel})`}
        >
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
            {initials(name)}
          </span>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="max-w-48 truncate text-sm font-semibold text-fg">{name}</span>
            <span className="text-xs text-muted">{roleLabel}</span>
          </span>
          <ChevronDown strokeWidth={1.75} className="size-4 text-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex flex-col gap-2 px-3 py-3">
          <span className="truncate text-md font-semibold text-fg">{name}</span>
          <span>
            <Badge tone={role === 'admin' ? 'primary' : 'success'}>{roleLabel}</Badge>
          </span>
        </div>
        <DropdownMenuSeparator />
        <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{t('topbar.theme')}</p>
        {THEMES.map(({ value, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon strokeWidth={1.75} aria-hidden />
            <span className="flex-1">{tWeb(value)}</span>
            {mounted && theme === value ? <Check strokeWidth={1.75} className="text-primary" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{t('topbar.language')}</p>
        {ADMIN_LOCALES.map((l) => (
          <DropdownMenuItem key={l} lang={l} onSelect={() => changeLocale(l)}>
            <Languages strokeWidth={1.75} aria-hidden />
            <span className="flex-1">{tCommon(l)}</span>
            {locale === l ? <Check strokeWidth={1.75} className="text-primary" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={() => {
            setSigningOut(true);
            void signOutToAdminLogin(locale);
          }}
        >
          <LogOut strokeWidth={1.75} aria-hidden />
          {t('topbar.sign_out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
