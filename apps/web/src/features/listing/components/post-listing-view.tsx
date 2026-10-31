// Khung server của form đăng / sửa tin (đọc theo request: cookie phiên → luôn nằm trong <Suspense> của page).
// Lấy hồ sơ (khu mặc định), danh mục khu, tin đang sửa rồi giao cho ListingForm (client).
import { type ListingFeature, LISTING_FEATURES } from '@hp/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '../display';
import { getMyListingForEdit, getPostFormContext } from '../queries';
import { ListingForm } from './listing-form/listing-form';

type RawParams = Record<string, string | string[] | undefined>;

function parseFeature(raw: RawParams): ListingFeature | null {
  const v = Array.isArray(raw.feature) ? raw.feature[0] : raw.feature;
  return v && v in LISTING_FEATURES ? (v as ListingFeature) : null;
}

async function ContextError({ code }: { code: string }) {
  const t = await getTranslations();
  return (
    <EmptyState title={t('common.states.error_title')} description={t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.unknown')} />
  );
}

/** /dang-tin?feature=pass|room|job|lostFound */
export async function PostListingView({ searchParams }: { searchParams: Promise<RawParams> }) {
  const feature = parseFeature(await searchParams);
  const ctx = await getPostFormContext();
  if (ctx.error) return <ContextError code={ctx.error.code} />;
  const locale = asLocale(await getLocale());
  return (
    <ListingForm
      key={feature ?? 'none'}
      mode="create"
      userId={ctx.data.profile.id}
      sites={ctx.data.sites}
      defaults={{ site: ctx.data.profile.site, lang: locale }}
      initialFeature={feature}
      listing={null}
    />
  );
}

/** /toi/tin-cua-toi/[id]/sua */
export async function EditListingView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, listing] = await Promise.all([getPostFormContext(), getMyListingForEdit(id)]);
  if (listing.error?.code === 'not_found' || listing.error?.code === 'invalid_input') notFound();
  if (ctx.error) return <ContextError code={ctx.error.code} />;
  if (listing.error) return <ContextError code={listing.error.code} />;
  const locale = asLocale(await getLocale());
  return (
    <ListingForm
      mode="edit"
      userId={ctx.data.profile.id}
      sites={ctx.data.sites}
      defaults={{ site: ctx.data.profile.site, lang: locale }}
      initialFeature={null}
      listing={listing.data}
    />
  );
}

export function ListingFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="ml-auto h-12 w-32" />
      </div>
    </div>
  );
}
