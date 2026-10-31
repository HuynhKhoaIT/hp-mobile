// Trang giữ chỗ: Tìm kiếm (tuần 4). Thanh điều hướng đã trỏ tới đây nên không để 404.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon } from '@/components/shared/coming-soon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('search_placeholder') };
}

export default async function Page() {
  const t = await getTranslations('common.nav');
  return <ComingSoon title={t('search_placeholder')} />;
}
