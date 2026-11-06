// /tinh-nang/[slug] — trang giới thiệu từng dịch vụ (6 trang tĩnh, slug ở features/marketing/links.ts).
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { SERVICE_VISUALS } from '@/features/home/services';
import { asLocale } from '@/features/listing/display';
import { TrackedLink } from '@/features/marketing/components/tracked-link';
import { FEATURE_PAGES } from '@/features/marketing/links';
import { localeAlternates } from '@/i18n/alternates';
import { cn } from '@/lib/utils';

export function generateStaticParams() {
  return FEATURE_PAGES.map(({ slug }) => ({ slug }));
}

const findPage = (slug: string) => FEATURE_PAGES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: PageProps<'/[locale]/tinh-nang/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) return {};
  const t = await getTranslations('web.marketing.features');
  const locale = asLocale(await getLocale());
  return {
    title: t(`${page.feature}.title`),
    description: t(`${page.feature}.summary`),
    alternates: localeAlternates(`/tinh-nang/${slug}`, locale),
  };
}

export default async function Page({ params }: PageProps<'/[locale]/tinh-nang/[slug]'>) {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) notFound();
  const t = await getTranslations('web.marketing');
  const { feature } = page;
  const { Icon, soft, fg } = SERVICE_VISUALS[feature];
  const title = t(`features.${feature}.title`);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <span aria-hidden className={cn('flex size-14 items-center justify-center rounded-lg', soft, fg)}>
        <Icon strokeWidth={1.75} className="size-8" />
      </span>
      <h1 className="text-3xl font-bold text-fg">{title}</h1>
      <p className="text-lg text-fg">{t(`features.${feature}.summary`)}</p>
      <ul className="flex flex-col gap-2">
        {(['b1', 'b2', 'b3'] as const).map((key) => (
          <li key={key} className="flex items-start gap-2 text-md text-fg">
            <Check aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-success" />
            {t(`features.${feature}.${key}`)}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <TrackedLink
          href={page.href}
          event="cta_web_start"
          eventProps={{ from: 'feature', feature }}
          className={buttonVariants({ size: 'lg' })}
        >
          {t(page.kind === 'group' ? 'feature_cta_group' : 'feature_cta_open', { title })}
        </TrackedLink>
        <TrackedLink
          href="/tai-app"
          event="cta_store_click"
          eventProps={{ from: 'feature', feature }}
          className={buttonVariants({ size: 'lg', variant: 'outline' })}
        >
          {t('hero.cta_app')}
        </TrackedLink>
      </div>
    </div>
  );
}
