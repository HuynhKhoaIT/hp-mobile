// Khung server của form tạo nhóm (/tao-nhom/[kind]) — đọc theo request (cookie phiên) nên luôn nằm trong <Suspense> của page.
// Lấy hồ sơ (khu làm việc → điểm đi mặc định, lọc danh mục sân) + danh mục khu rồi giao cho GroupForm (client).
import type { GroupKind } from '@hp/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { getPostFormContext } from '@/features/listing/queries';
import { GroupForm, GroupFormHero } from './group-form';

export async function CreateGroupView({ kind }: { kind: GroupKind }) {
  const ctx = await getPostFormContext();
  if (ctx.error) {
    const t = await getTranslations();
    const code = ctx.error.code;
    return (
      <EmptyState
        title={t('common.states.error_title')}
        description={t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.unknown')}
      />
    );
  }
  const locale = asLocale(await getLocale());
  const siteName = ctx.data.sites.find((s) => s.code === ctx.data.profile.site)?.name ?? '';
  return <GroupForm kind={kind} defaultOrigin={siteName} site={ctx.data.profile.site ?? null} lang={locale} />;
}

/**
 * Khung chờ đúng hình form: header xanh (biết kind → header thật; loading.tsx không có params → dải xanh trống cùng cỡ)
 * → thẻ chip loại → các khối tiêu đề vạch + thẻ ô nhập.
 */
export function GroupFormSkeleton({ kind }: { kind?: GroupKind }) {
  return (
    <div className="flex flex-col gap-6">
      {kind ? (
        <GroupFormHero kind={kind} />
      ) : (
        <div aria-hidden className="-mx-4 -mt-6 h-24 rounded-b-xl bg-primary sm:mx-0 sm:mt-0 sm:h-28 sm:rounded-xl" />
      )}
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-28 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <Skeleton className="ml-auto h-12 w-36" />
      </div>
    </div>
  );
}
