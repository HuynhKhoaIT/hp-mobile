'use client';

// Nút "Tạo chuyến" / "Tạo kèo" của danh sách nhóm: khách → LoginDialog tại chỗ; đã đăng nhập → /tao-nhom/{kind}.
// Chưa biết phiên (đang kiểm tra / tắt JS) → link thường, proxy.ts tự chuyển khách sang /dang-nhap?next=/tao-nhom/{kind}.
import type { GroupKind } from '@hp/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { Link } from '@/i18n/navigation';
import { GROUP_FEATURE_CONFIGS } from '../features';

export function CreateGroupButton({ kind }: { kind: GroupKind }) {
  const t = useTranslations('group.list');
  const userId = useSessionUser();
  const content = (
    <>
      <Plus strokeWidth={2} aria-hidden />
      {t(`create_${kind}`)}
    </>
  );

  if (userId === null) {
    return (
      <LoginDialog
        trigger={
          <Button variant="accent" type="button">
            {content}
          </Button>
        }
      />
    );
  }
  return (
    <Button asChild variant="accent">
      <Link href={GROUP_FEATURE_CONFIGS[kind].createPath}>{content}</Link>
    </Button>
  );
}
