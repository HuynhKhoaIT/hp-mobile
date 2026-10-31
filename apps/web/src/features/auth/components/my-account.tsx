// Khối "Tôi" tạm thời (tuần 2–3): ảnh đại diện (đổi được), tên, số điện thoại, nơi làm việc, quan tâm, đăng xuất.
// Trang hồ sơ đầy đủ (tin của tôi, đã lưu, cài đặt) ở tuần 5–8. Đọc theo request → đặt trong Suspense.
import { needsOnboarding } from '@hp/core';
import { formatVnPhone } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { getMyProfileForPage, getSitesForPage } from '@/features/auth/queries';
import { AvatarPicker } from '@/features/profile/components/avatar-picker';
import { Link } from '@/i18n/navigation';
import { SignOutButton } from './sign-out-button';

export async function MyAccount() {
  const t = await getTranslations();
  const profile = await getMyProfileForPage();
  if (profile.error) {
    const key = `errors.${profile.error.code}`;
    return <EmptyState title={t('common.states.error_title')} description={t.has(key) ? t(key) : t('errors.unknown')} />;
  }
  const me = profile.data;
  const sites = await getSitesForPage();
  const siteName = sites.data?.find((s) => s.code === me.site)?.name;

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-surface p-6 shadow-card">
      <h1 className="text-2xl font-semibold text-fg">{me.full_name || t('common.nav.me')}</h1>
      <AvatarPicker userId={me.id} initialValue={me.avatar_url} label={t('web.me.avatar')} />
      <dl className="grid gap-4 sm:grid-cols-2">
        {me.phone ? (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">{t('web.me.phone')}</dt>
            <dd className="text-md text-fg">{formatVnPhone(me.phone)}</dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">{t('web.me.site')}</dt>
          <dd className="text-md text-fg">{siteName ?? t('web.me.no_site')}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-sm text-muted">{t('web.me.interests')}</dt>
          <dd className="flex flex-wrap gap-2">
            {me.interests.length === 0 ? <span className="text-md text-fg">{t('web.me.no_site')}</span> : null}
            {me.interests.map((f) => (
              <span key={f} className="rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-primary">
                {t(`common.feature.${f}`)}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {needsOnboarding(me) ? (
          <Button asChild>
            <Link href={{ pathname: '/dang-nhap', query: { next: '/toi' } }}>{t('auth.onboarding.next')}</Link>
          </Button>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}
