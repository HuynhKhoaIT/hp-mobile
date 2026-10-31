// UserMenu — góc phải header: khách thấy nút Đăng nhập (mở dialog); đã đăng nhập thấy lối vào trang "Tôi".
// Đọc phiên theo request → luôn đặt trong <Suspense fallback={<UserMenuSkeleton />}>.
import { CircleUser } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUserId } from '@/features/auth/queries';
import { Link } from '@/i18n/navigation';
import { LoginButton } from './login-button';

export async function UserMenu() {
  const userId = await getCurrentUserId();
  if (!userId) return <LoginButton />;
  const t = await getTranslations('common.nav');
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href="/toi" aria-label={t('me')}>
        <CircleUser strokeWidth={1.75} className="size-6" />
      </Link>
    </Button>
  );
}

export function UserMenuSkeleton() {
  return <Skeleton className="h-11 w-28" />;
}
