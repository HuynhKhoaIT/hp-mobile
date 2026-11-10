// /dieu-khoan — nội dung MDX 3 ngôn ngữ ở content/legal/{vi,en,zh}/dieu-khoan.mdx.
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { loadLegal } from '@/features/marketing/content';
import { LegalDoc } from '@/features/marketing/components/legal-page';
import { localeAlternates } from '@/i18n/alternates';

export async function generateMetadata(): Promise<Metadata> {
  const locale = asLocale(await getLocale());
  const { meta } = await loadLegal('dieu-khoan', locale);
  return { title: meta.title, description: meta.description, alternates: localeAlternates('/dieu-khoan', locale) };
}

export default async function Page() {
  return <LegalDoc slug="dieu-khoan" locale={asLocale(await getLocale())} />;
}
