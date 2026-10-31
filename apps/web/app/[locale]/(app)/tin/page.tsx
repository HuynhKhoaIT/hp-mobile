// Trang giữ chỗ: Danh sách tin (tuần 3). Thanh điều hướng đã trỏ tới đây nên không để 404.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon } from '@/components/shared/coming-soon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('explore') };
}

export default async function Page() {
  const t = await getTranslations('common.nav');
  return <ComingSoon title={t('explore')} />;
}
