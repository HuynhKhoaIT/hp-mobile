// Trang giữ chỗ cho tính năng chưa làm (điều hướng không dẫn vào 404). Thay bằng trang thật theo docs/plan/web.md.
import { Hammer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from './empty-state';

export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations('web.home');
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      <EmptyState icon={Hammer} title={t('coming_soon')} />
    </section>
  );
}
