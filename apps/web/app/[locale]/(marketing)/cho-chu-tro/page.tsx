// /cho-chu-tro — trang cho chủ trọ + form lead (kind mặc định landlord).
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { LeadForm } from '@/features/marketing/components/lead-form';
import { localeAlternates } from '@/i18n/alternates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.marketing.landlord');
  const locale = asLocale(await getLocale());
  return { title: t('meta_title'), description: t('meta_description'), alternates: localeAlternates('/cho-chu-tro', locale) };
}

export default async function Page() {
  const t = await getTranslations('web.marketing.landlord');
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-fg">{t('title')}</h1>
        <p className="text-lg text-fg">{t('subtitle')}</p>
        <ul className="flex flex-col gap-2">
          {(['b1', 'b2', 'b3'] as const).map((key) => (
            <li key={key} className="flex items-start gap-2 text-md text-fg">
              <Check aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-success" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
      <LeadForm source="cho-chu-tro" defaultKind="landlord" />
    </div>
  );
}
