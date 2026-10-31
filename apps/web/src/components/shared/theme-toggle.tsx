'use client';

// Chọn giao diện: theo máy / sáng / tối. Trạng thái chọn chỉ hiện sau khi chạy ở trình duyệt
// (server không biết theme đã lưu) để tránh lệch hydrate.
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

const OPTIONS = [
  { value: 'system', Icon: Monitor },
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
] as const;

const noop = () => () => {};

export function ThemeToggle() {
  const t = useTranslations('web');
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <div role="group" aria-label={t('header.theme')} className="flex items-center gap-1">
      {OPTIONS.map(({ value, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t(`theme.${value}`)}
          aria-pressed={mounted ? theme === value : undefined}
          className={mounted && theme === value ? 'bg-primary-light text-primary' : 'text-muted'}
          onClick={() => setTheme(value)}
        >
          <Icon strokeWidth={1.75} />
        </Button>
      ))}
    </div>
  );
}
