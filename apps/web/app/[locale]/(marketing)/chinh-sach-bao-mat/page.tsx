// /chinh-sach-bao-mat — khung trang pháp lý; nội dung MDX 3 ngôn ngữ viết trước khi lên store (tuần 11).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/features/marketing/components/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.legal');
  return { title: t('privacy') };
}

export default async function Page() {
  const t = await getTranslations('web.legal');
  return (
    <LegalPage title={t('privacy')}>
      <p className="text-muted">{t('drafting')}</p>
    </LegalPage>
  );
}
