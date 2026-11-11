'use client';

// Header trang chủ (docs/design/home.md §4.1, §10; style Stitch) — dải xanh primary, chữ on-primary, hoạ tiết mờ.
// Cùng tồn tại với AppHeader (header chung của khu (app)):
// - Điện thoại (< 640px): AppHeader ẩn ở "/" (AppHeaderShell) → đây là header DUY NHẤT: hàng 1 cao 48 gồm ảnh đại diện |
//   lời chào + dòng phụ | chuông (khách: tên app | nút Đăng nhập), chip khu, rồi ô tìm kiếm dính trên cùng (HubSearch).
// - Từ 640px: AppHeader giữ logo / tìm kiếm / Đăng tin / tin nhắn / chuông / tài khoản như mọi trang; dải xanh chỉ còn
//   lời chào lớn + chip khu (không lặp ô tìm, chuông, ảnh đại diện).
// Phiên chưa biết (trang tĩnh, đọc phiên ở trình duyệt) → skeleton cùng kích thước, không nhảy bố cục.
import { APP_NAME, givenName } from '@hp/shared';
import { CircleUser, LogIn } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LoginDialog } from '@/components/shared/login-dialog';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { Link } from '@/i18n/navigation';
import { profileAvatarUrl } from '@/lib/images';
import { useHome, type Viewer } from './home-context';
import { SitePicker } from './site-picker';

function greetingOf(viewer: Viewer, t: ReturnType<typeof useTranslations>): string | null {
  if (viewer.status === 'loading') return null;
  const name = viewer.status === 'user' ? givenName(viewer.profile?.full_name) : '';
  return name ? t('common.home.greeting', { name }) : t('common.home.greeting_guest');
}

function Avatar({ viewer }: { viewer: Extract<Viewer, { status: 'user' }> }) {
  const t = useTranslations('common.nav');
  const src = profileAvatarUrl(viewer.profile?.avatar_url);
  const initial = givenName(viewer.profile?.full_name).charAt(0).toUpperCase();
  return (
    <Link
      href="/toi"
      aria-label={t('me')}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-on-primary/60"
    >
      <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-on-primary/30 bg-on-primary/15 text-md font-semibold">
        {src ? (
          <Image src={src} alt="" fill unoptimized sizes="40px" className="object-cover" />
        ) : initial ? (
          <span aria-hidden>{initial}</span>
        ) : (
          <CircleUser aria-hidden strokeWidth={1.75} className="size-6" />
        )}
      </span>
    </Link>
  );
}

function PhoneRow() {
  const t = useTranslations();
  const { viewer } = useHome();
  const greeting = greetingOf(viewer, t);

  if (viewer.status === 'loading') {
    return (
      <div className="flex min-h-12 items-center gap-3" aria-hidden>
        <span className="size-10 shrink-0 animate-pulse rounded-full bg-on-primary/15 motion-reduce:animate-none" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="h-5 w-28 animate-pulse rounded-sm bg-on-primary/15 motion-reduce:animate-none" />
          <span className="h-4 w-40 animate-pulse rounded-sm bg-on-primary/15 motion-reduce:animate-none" />
        </span>
        <span className="size-11 shrink-0 animate-pulse rounded-full bg-on-primary/15 motion-reduce:animate-none" />
      </div>
    );
  }

  if (viewer.status === 'guest') {
    return (
      <div className="flex min-h-12 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-xl font-bold">{APP_NAME}</p>
          <p className="truncate text-sm opacity-90">{t('common.home.subtitle')}</p>
        </div>
        {/* Pill trong mờ trên nền primary (Stitch): chữ on-primary trên primary pha 15% — vẫn ≥ 4,5:1. */}
        <LoginDialog
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-on-primary/30 bg-on-primary/15 px-4 text-md font-semibold text-on-primary outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/60 active:scale-97 motion-reduce:active:scale-100"
            >
              <LogIn aria-hidden strokeWidth={1.75} className="size-5" />
              {t('auth.sign_in')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-12 items-center gap-3">
      <Avatar viewer={viewer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-xl font-bold">{greeting}</p>
        <p className="truncate text-sm opacity-90">{t('common.home.subtitle')}</p>
      </div>
      <NotificationBell variant="onPrimary" />
    </div>
  );
}

function WideGreeting() {
  const t = useTranslations();
  const { viewer } = useHome();
  const greeting = greetingOf(viewer, t);
  return (
    <div className="flex flex-col gap-1">
      {greeting === null ? (
        <span aria-hidden className="my-1 h-8 w-56 animate-pulse rounded-md bg-on-primary/15 motion-reduce:animate-none" />
      ) : (
        <p className="text-3xl font-bold">{greeting}</p>
      )}
      <p className="text-lg opacity-90">{t('common.home.subtitle')}</p>
    </div>
  );
}

/**
 * Hoạ tiết nền (style Stitch, nhẹ): vòng tròn on-primary mờ + vòng nét đứt lồng ngoài ở góc phải, một đốm nhỏ
 * (trang trí, ẩn với trình đọc màn hình, không nhận chạm). Giống app (HomeHeader).
 */
function HeaderDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute -top-16 -right-12 size-40 rounded-full bg-on-primary/10 sm:-top-32 sm:right-16 sm:size-64" />
      <span className="absolute -top-24 -right-20 size-56 rounded-full border-2 border-dashed border-on-primary/15 sm:-top-44 sm:right-6 sm:size-88" />
      <span className="absolute top-12 right-28 size-12 rounded-full bg-on-primary/10 sm:top-14 sm:right-1/4 sm:size-16" />
    </div>
  );
}

export function HubHeader() {
  return (
    <div className="relative bg-primary text-on-primary">
      <HeaderDecor />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-3 sm:gap-4 sm:pt-8">
        <div className="sm:hidden">
          <PhoneRow />
        </div>
        <div className="hidden sm:block">
          <WideGreeting />
        </div>
        <div className="flex">
          <SitePicker />
        </div>
      </div>
    </div>
  );
}
