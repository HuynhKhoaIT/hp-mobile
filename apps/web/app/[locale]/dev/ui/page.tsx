// /dev/ui — trưng component và token của web (tương đương app/(dev)/ui-gallery.tsx của mobile).
// Chỉ mở khi chạy dev; bản production trả 404. Thêm component shadcn / shared mới → thêm mục ở đây.
// Tên biến thể / token là định danh kỹ thuật, không dịch.
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

const VARIANTS = ['default', 'accent', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const SIZES = ['sm', 'default', 'lg'] as const;
const SWATCHES = [
  'bg-primary',
  'bg-primary-light',
  'bg-accent',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-bg',
  'bg-surface',
  'bg-surface-2',
  'bg-border',
];
// Class đầy đủ để Tailwind quét được (không ghép chuỗi động).
const SERVICES = [
  { key: 'pass', soft: 'bg-service-pass-soft', fg: 'bg-service-pass' },
  { key: 'room', soft: 'bg-service-room-soft', fg: 'bg-service-room' },
  { key: 'job', soft: 'bg-service-job-soft', fg: 'bg-service-job' },
  { key: 'ride', soft: 'bg-service-ride-soft', fg: 'bg-service-ride' },
  { key: 'sport', soft: 'bg-service-sport-soft', fg: 'bg-service-sport' },
  { key: 'lostFound', soft: 'bg-service-lost-found-soft', fg: 'bg-service-lost-found' },
] as const;
const TYPE_SCALE = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-md', 'text-sm', 'text-xs'] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

export default async function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const t = await getTranslations();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8">
      <h1 className="text-2xl font-semibold text-fg">{t('web.dev.title')}</h1>

      <Section title={t('web.dev.buttons')}>
        <div className="flex flex-wrap gap-3">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant === 'accent' ? t('common.actions.post') : variant}
            </Button>
          ))}
        </div>
        <h3 className="text-md font-medium text-muted">{t('web.dev.sizes')}</h3>
        <div className="flex flex-wrap items-center gap-3">
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
        </div>
        <h3 className="text-md font-medium text-muted">{t('web.dev.states')}</h3>
        <div className="flex flex-wrap gap-3">
          <Button disabled>{t('web.dev.disabled')}</Button>
          <Button variant="outline" disabled>
            {t('web.dev.disabled')}
          </Button>
        </div>
      </Section>

      <Section title={t('common.dev.colors')}>
        <div className="flex flex-wrap gap-4">
          {SWATCHES.map((swatch) => (
            <div key={swatch} className="flex flex-col items-center gap-1">
              <div className={`size-14 rounded-md border border-border ${swatch}`} />
              <span className="text-xs text-muted">{swatch.replace('bg-', '')}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('common.dev.service_colors')}>
        <div className="flex flex-wrap gap-3">
          {SERVICES.map((service) => (
            <div key={service.key} className={`flex w-32 flex-col items-center gap-2 rounded-md p-3 ${service.soft}`}>
              <div className={`size-6 rounded-full ${service.fg}`} />
              <span className="text-sm text-fg">{t(`common.feature.${service.key}`)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('common.dev.typography')}>
        {TYPE_SCALE.map((size) => (
          <div key={size} className="flex flex-col gap-1">
            <span className="text-xs text-muted">{size}</span>
            <p className={`${size} text-fg`}>{t('common.dev.sample')}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}
