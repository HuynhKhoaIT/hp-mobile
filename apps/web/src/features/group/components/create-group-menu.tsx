'use client';

// Nút "Tạo nhóm" ở header Nhóm của tôi (khớp CreateGroupSheet của app): menu chọn từng tính năng Group theo config (ô icon
// dịch vụ + "Tạo chuyến" / "Tạo kèo" + dòng phụ của danh sách) → /tao-nhom/{kind}. Trang nằm trong khu (auth) nên người
// xem đã đăng nhập; proxy.ts vẫn chặn khách ở /tao-nhom. Thêm tính năng Group mới = thêm config, không sửa ở đây.
import { GROUP_KINDS } from '@hp/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { GROUP_FEATURE_CONFIGS } from '../features';

export function CreateGroupMenu() {
  const t = useTranslations('group');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="accent" className="rounded-full font-semibold">
          <Plus strokeWidth={2} aria-hidden />
          {t('mine.create')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {GROUP_KINDS.map((kind) => {
          const cfg = GROUP_FEATURE_CONFIGS[kind];
          return (
            <DropdownMenuItem key={kind} asChild className="py-2">
              <Link href={cfg.createPath}>
                <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', cfg.tone.soft)}>
                  <cfg.Icon strokeWidth={1.75} className={cfg.tone.fg} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-fg">{t(`list.create_${kind}`)}</span>
                  <span className="text-sm text-muted">{t(`list.subtitle_${kind}`)}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
