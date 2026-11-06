// Trang pháp lý / bài viết: nội dung MDX trong khung đọc. `fallback` = chưa dịch → thông báo đang hiện bản tiếng Việt.
import { formatDate, type Locale } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { type LegalSlug, loadLegal } from '../content';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-semibold text-fg">{title}</h1>
      <div className="flex flex-col gap-4 text-md text-fg">{children}</div>
    </article>
  );
}

export async function NotTranslatedNotice() {
  const t = await getTranslations('web.content');
  return <p className="rounded-md bg-surface-2 p-3 text-sm text-fg">{t('not_translated')}</p>;
}

export async function LegalDoc({ slug, locale }: { slug: LegalSlug; locale: Locale }) {
  const t = await getTranslations('web.content');
  const { Content, meta, fallback } = await loadLegal(slug, locale);
  return (
    <LegalPage title={meta.title}>
      {fallback ? <NotTranslatedNotice /> : null}
      <p className="text-sm text-muted">{t('updated', { date: formatDate(meta.updated, locale) })}</p>
      <Content />
    </LegalPage>
  );
}
