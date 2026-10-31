// Trang giữ chỗ: Đăng tin (tuần 5). Thanh điều hướng đã trỏ tới đây nên không để 404.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon } from '@/components/shared/coming-soon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.actions');
  return { title: t('post') };
}

export default async function Page() {
  const t = await getTranslations('common.actions');
  return <ComingSoon title={t('post')} />;
}
