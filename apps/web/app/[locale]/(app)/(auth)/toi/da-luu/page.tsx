// /toi/da-luu — Tin đã lưu (bookmarks). Đọc theo request → trong <Suspense>; tin đã gỡ / bị chặn tự biến mất (view lọc).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ListingGridSkeleton } from '@/components/shared/skeletons';
import { SavedListingsView } from '@/features/listing/components/saved-listings-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('listing.saved');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page() {
  const t = await getTranslations('listing.saved');
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
      <Suspense fallback={<ListingGridSkeleton count={4} />}>
        <SavedListingsView />
      </Suspense>
    </section>
  );
}
