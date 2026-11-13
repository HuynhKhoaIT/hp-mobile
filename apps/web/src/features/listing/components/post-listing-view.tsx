// Khung server của form đăng / sửa tin (đọc theo request: cookie phiên → luôn nằm trong <Suspense> của page).
// Lấy hồ sơ (khu mặc định, SĐT của chính chủ để nhắc số nào hiện qua "Hiện số"), danh mục khu, tin đang sửa rồi giao cho
// ListingForm (client). Khung trang: tràn mép trên điện thoại (header xanh của form), từ 640px là khối giữa trang.
import { featureOfCategory, LISTING_CATEGORIES, type ListingCategory, type ListingFeature, LISTING_FEATURES } from '@hp/shared';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '../display';
import { getMyListingForEdit, getPostFormContext } from '../queries';
import { RefreshErrorState } from './list-error';
import { ListingForm, type ListingFormScope } from './listing-form/listing-form';

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** ?feature= và ?category= (banner danh sách mở thẳng đúng danh mục). Category lạ / không thuộc feature → bỏ qua. */
function parsePreset(raw: RawParams): { feature: ListingFeature | null; category: ListingCategory | null } {
  const f = first(raw.feature);
  const c = first(raw.category);
  const category = c && (LISTING_CATEGORIES as readonly string[]).includes(c) ? (c as ListingCategory) : null;
  const feature = f && f in LISTING_FEATURES ? (f as ListingFeature) : null;
  if (category && (!feature || featureOfCategory(category) === feature)) return { feature: featureOfCategory(category), category };
  return { feature, category: null };
}

/** Lỗi đọc hồ sơ / khu / tin: khối lỗi + "Thử lại" (đọc lại phần server của trang — router.refresh). */
function ContextError({ code }: { code: string }) {
  return <RefreshErrorState code={code} />;
}

/** /dang-tin?feature=pass|room|job|lostFound[&category=<code>]; trong mini-app (/pass-do/dang-tin) có `scope` khoá tính năng. */
export async function PostListingView({ searchParams, scope }: { searchParams: Promise<RawParams>; scope?: ListingFormScope }) {
  const preset = parsePreset(await searchParams);
  // Mini-app: bỏ ?feature / ?category của tính năng khác.
  const { feature, category } = scope && preset.feature !== scope.feature ? { feature: scope.feature, category: null } : preset;
  const ctx = await getPostFormContext();
  if (ctx.error) return <ContextError code={ctx.error.code} />;
  const locale = asLocale(await getLocale());
  return (
    <ListingForm
      key={category ?? feature ?? 'none'}
      mode="create"
      userId={ctx.data.profile.id}
      sites={ctx.data.sites}
      defaults={{ site: ctx.data.profile.site, lang: locale }}
      phone={ctx.data.profile.phone}
      initialFeature={feature}
      initialCategory={category}
      listing={null}
      scope={scope}
    />
  );
}

/**
 * /toi/tin-cua-toi/[id]/sua; trong mini-app (/pass-do/quan-ly/[id]/sua) có `scope`: tin thuộc tính năng khác → 404 (trang sửa
 * chung vẫn mở được qua /toi).
 */
export async function EditListingView({ params, scope }: { params: Promise<{ id: string }>; scope?: ListingFormScope }) {
  const { id } = await params;
  const [ctx, listing] = await Promise.all([getPostFormContext(), getMyListingForEdit(id)]);
  if (listing.error?.code === 'not_found' || listing.error?.code === 'invalid_input') notFound();
  if (scope && listing.data && featureOfCategory(listing.data.category) !== scope.feature) notFound();
  if (ctx.error) return <ContextError code={ctx.error.code} />;
  if (listing.error) return <ContextError code={listing.error.code} />;
  const locale = asLocale(await getLocale());
  return (
    <ListingForm
      mode="edit"
      userId={ctx.data.profile.id}
      sites={ctx.data.sites}
      defaults={{ site: ctx.data.profile.site, lang: locale }}
      phone={ctx.data.profile.phone}
      initialFeature={null}
      initialCategory={null}
      listing={listing.data}
      scope={scope}
    />
  );
}

/** Khung chờ đúng hình form: header xanh (nút tròn + tiêu đề) → thẻ chọn loại tin (lưới 4 ô) → nút. */
export function ListingFormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-b-xl bg-primary px-4 pt-3 pb-5 sm:rounded-xl sm:p-6">
        <div className="flex min-h-12 items-center gap-3">
          <div className="size-11 rounded-full bg-on-primary/15" />
          <div className="h-6 w-40 rounded-full bg-on-primary/15" />
        </div>
        <div className="h-9 rounded-md bg-on-primary/10" />
      </div>
      <div className="mx-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:mx-0 sm:p-6">
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
