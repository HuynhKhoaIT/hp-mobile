// /toi/cai-dat — cài đặt: ngôn ngữ (LocaleSwitcher dùng chung), giao diện, xoá tài khoản (DeleteAccount — dialog gõ từ xác
// nhận → delete_my_account → đăng xuất → trang chủ). Web không có push nên không có tuỳ chọn thông báo đẩy.
// Khu (auth): proxy.ts chặn khách (→ /dang-nhap?next=…), noindex. Không đọc cookie ở server → khung tĩnh.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DeleteAccount } from '@/features/profile/components/delete-account';
import { PreferencesCard } from '@/features/profile/components/me-settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.me');
  return { title: t('settings'), robots: { index: false, follow: false } };
}

export default async function Page() {
  const t = await getTranslations('web.me');
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold text-fg">{t('settings')}</h1>
      <PreferencesCard />
      <DeleteAccount />
    </section>
  );
}
