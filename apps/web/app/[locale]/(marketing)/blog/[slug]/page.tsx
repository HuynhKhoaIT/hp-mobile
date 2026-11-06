// /blog/[slug] — bài MDX. Bản nháp / không có → 404; thiếu bản dịch → bản tiếng Việt kèm thông báo.
import { formatDate } from '@hp/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { LegalPage, NotTranslatedNotice } from '@/features/marketing/components/legal-page';
import { blogSlugs, loadBlogPost } from '@/features/marketing/content';
import { localeAlternates } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  return blogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const locale = asLocale(await getLocale());
  const post = await loadBlogPost(slug, locale);
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
    alternates: localeAlternates(`/blog/${slug}`, locale),
  };
}

export default async function Page({ params }: PageProps<'/[locale]/blog/[slug]'>) {
  const { slug } = await params;
  const locale = asLocale(await getLocale());
  const post = await loadBlogPost(slug, locale);
  if (!post) notFound();
  const t = await getTranslations('web.marketing.blog');
  const { Content, meta, fallback } = post;
  return (
    <LegalPage title={meta.title}>
      {fallback ? <NotTranslatedNotice /> : null}
      <p className="text-sm text-muted">{formatDate(meta.date, locale)}</p>
      <Content />
      <Link href="/blog" className="inline-flex min-h-11 items-center text-md font-medium text-primary">
        {t('back')}
      </Link>
    </LegalPage>
  );
}
