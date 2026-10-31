// /ghep-xe — Ghép xe về quê (mẫu Group, tuần 7–8). Ô "Sắp có" trên trang chủ trỏ tới đây: giữ đúng URL đã chốt, không 404.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoon } from '@/components/shared/coming-soon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.feature');
  return { title: t('ride'), robots: { index: false, follow: true } };
}

export default async function Page() {
  const t = await getTranslations('common.feature');
  return <ComingSoon title={t('ride')} />;
}
