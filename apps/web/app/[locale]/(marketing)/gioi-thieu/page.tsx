// /gioi-thieu — giới thiệu + dòng độc lập, không thuộc Tập đoàn Hòa Phát (bắt buộc ở trang Giới thiệu).
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/features/marketing/components/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.legal');
  return { title: t('about') };
}

export default async function AboutPage() {
  const t = await getTranslations();
  return (
    <LegalPage title={t('web.legal.about')}>
      <p>{t('web.legal.about_body', { appName: APP_NAME })}</p>
      <p className="rounded-md bg-surface-2 p-4 font-medium">{t('web.legal.about_independent')}</p>
      <p className="text-muted">{t('common.disclaimer')}</p>
    </LegalPage>
  );
}
