// /tai-app — trang tĩnh: QR + 2 nút kho; điện thoại tự chuyển sang kho (DownloadRedirect). Chưa có link kho → báo sắp lên kho.
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { DownloadRedirect } from '@/features/marketing/components/download-redirect';
import { QrCode } from '@/features/marketing/components/qr-code';
import { TrackedExternalLink, TrackedLink } from '@/features/marketing/components/tracked-link';
import { qrPath, storeLinks } from '@/features/marketing/links';
import { absoluteUrl, localeAlternates } from '@/i18n/alternates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.marketing.download');
  const locale = asLocale(await getLocale());
  return {
    title: t('meta_title'),
    description: t('meta_description', { appName: APP_NAME }),
    alternates: localeAlternates('/tai-app', locale),
  };
}

export default async function Page() {
  const t = await getTranslations('web.marketing.download');
  const locale = asLocale(await getLocale());
  const stores = storeLinks('tai_app');
  const href = (key: 'app_store' | 'play_store') => stores.find((s) => s.key === key)?.href ?? '';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-12 text-center">
      <DownloadRedirect ios={href('app_store')} android={href('play_store')} />
      <h1 className="text-3xl font-bold text-fg">{t('title', { appName: APP_NAME })}</h1>
      <p className="text-lg text-fg">{t('subtitle')}</p>
      {stores.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {stores.map((s) => (
              <TrackedExternalLink
                key={s.key}
                href={s.href}
                event="cta_store_click"
                eventProps={{ store: s.key, from: 'tai_app' }}
                className={buttonVariants({ size: 'lg' })}
              >
                {t(s.key)}
              </TrackedExternalLink>
            ))}
          </div>
          <div className="hidden flex-col items-center gap-2 lg:flex">
            <QrCode value={absoluteUrl(qrPath('tai_app'), locale)} label={t('qr_label')} className="size-48" />
            <p className="text-sm text-muted">{t('qr_hint')}</p>
          </div>
        </>
      ) : (
        <p className="rounded-md bg-surface-2 p-4 text-md text-fg">{t('unavailable')}</p>
      )}
      <TrackedLink
        href="/"
        event="cta_web_start"
        eventProps={{ from: 'tai_app' }}
        className={buttonVariants({ size: 'lg', variant: 'outline' })}
      >
        {t('use_web')}
      </TrackedLink>
    </div>
  );
}
