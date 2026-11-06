// /blog — danh sách bài đã đăng (MDX, features/marketing/content.ts).
import { formatDate } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { listBlogPosts } from '@/features/marketing/content';
import { localeAlternates } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.marketing.blog');
  const locale = asLocale(await getLocale());
  return { title: t('meta_title'), description: t('meta_description'), alternates: localeAlternates('/blog', locale) };
}

export default async function Page() {
  const t = await getTranslations('web.marketing.blog');
  const locale = asLocale(await getLocale());
  const posts = await listBlogPosts(locale);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold text-fg">{t('title')}</h1>
      {posts.length === 0 ? <p className="text-md text-muted">{t('empty')}</p> : null}
      <ul className="flex flex-col gap-3">
        {posts.map(({ slug, meta }) => (
          <li key={slug}>
            <Link
              href={`/blog/${slug}`}
              className="flex flex-col gap-1 rounded-lg bg-surface p-4 shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="text-lg font-semibold text-fg">{meta.title}</span>
              <span className="text-md text-muted">{meta.description}</span>
              <span className="text-sm text-muted">{formatDate(meta.date, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
