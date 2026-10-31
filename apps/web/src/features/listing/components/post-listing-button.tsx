'use client';

// Nút "Đăng tin" của trang danh sách: khách → LoginDialog tại chỗ; đã đăng nhập → /dang-tin (?feature= chọn sẵn tính năng
// của trang). Chưa biết phiên (đang kiểm tra / tắt JS) → link thường, proxy.ts tự chuyển khách sang /dang-nhap.
import type { ListingFeature } from '@hp/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { Link } from '@/i18n/navigation';

export function PostListingButton({ feature }: { feature?: ListingFeature | null }) {
  const t = useTranslations('listing.list');
  const userId = useSessionUser();
  const content = (
    <>
      <Plus strokeWidth={2} aria-hidden />
      {t('post_cta')}
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
      <Link href={feature ? { pathname: '/dang-tin', query: { feature } } : '/dang-tin'}>{content}</Link>
    </Button>
  );
}
