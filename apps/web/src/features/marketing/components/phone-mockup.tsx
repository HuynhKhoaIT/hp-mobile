// Minh hoạ điện thoại vẽ bằng CSS: lưới 6 dịch vụ, không phải ảnh chụp màn hình (chưa có ảnh thật, không dựng dữ liệu giả).
// Nổi nhẹ bằng animate-float; giảm chuyển động → đứng yên.
import { getTranslations } from 'next-intl/server';
import { SERVICE_VISUALS } from '@/features/home/services';
import { cn } from '@/lib/utils';
import { FEATURE_PAGES } from '../links';

export async function PhoneMockup({ label }: { label: string }) {
  const t = await getTranslations('web.marketing.features');
  return (
    <div
      role="img"
      aria-label={label}
      className="w-60 shrink-0 rounded-xl border-4 border-border bg-bg p-3 shadow-card motion-safe:animate-float"
    >
      <div className="mb-3 h-16 rounded-lg bg-primary" />
      <div aria-hidden className="grid grid-cols-3 gap-2">
        {FEATURE_PAGES.map(({ slug, feature }) => {
          const { Icon, soft, fg } = SERVICE_VISUALS[feature];
          return (
            <div key={slug} className="flex flex-col items-center gap-1 text-center">
              <span className={cn('flex size-11 items-center justify-center rounded-md', soft, fg)}>
                <Icon strokeWidth={1.75} className="size-5" />
              </span>
              <span className="text-xs text-fg">{t(`${feature}.title`)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-12 rounded-md bg-surface" />
        <div className="h-12 rounded-md bg-surface" />
      </div>
    </div>
  );
}
