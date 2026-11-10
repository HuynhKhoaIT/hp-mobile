// Landing ở /gioi-thieu (`/` là Hub — đã chốt 2026-11-05). Thứ tự khối theo apps/web/CLAUDE.md mục 9:
// Hero → 6 dịch vụ → tin mới nhất → 3 bước → an toàn → số liệu → (cảm nhận) → cho chủ trọ / sân / tuyển dụng → FAQ → CTA.
// Khối "Cảm nhận người dùng" chưa có: chỉ thêm khi có phản hồi thật đã xin phép, không viết lời chứng thực giả.
// Số liệu chỉ hiện khi đủ lớn (getLandingStats). Dòng độc lập có ở khối FAQ, câu đầu, và footer.
import { APP_NAME, formatNumber } from '@hp/shared';
import { Building2, Dumbbell, Flag, Lock, ShieldCheck, Store, type LucideIcon } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/shared/json-ld';
import { buttonVariants } from '@/components/ui/button';
import { SERVICE_VISUALS } from '@/features/home/services';
import { asLocale } from '@/features/listing/display';
import { ListingCard } from '@/features/listing/components/listing-card';
import { absoluteUrl } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import { publicEnv } from '@/lib/env';
import { cn } from '@/lib/utils';
import { FEATURE_PAGES, qrPath } from '../links';
import { getLandingStats, getLatestListings } from '../queries';
import { LeadSection } from './lead-section';
import { PhoneMockup } from './phone-mockup';
import { QrCode } from './qr-code';
import { TrackedLink } from './tracked-link';

const SAFETY: { key: 'moderation' | 'privacy' | 'report'; Icon: LucideIcon }[] = [
  { key: 'moderation', Icon: ShieldCheck },
  { key: 'privacy', Icon: Lock },
  { key: 'report', Icon: Flag },
];
const PARTNERS: { key: 'landlord' | 'venue' | 'employer'; Icon: LucideIcon }[] = [
  { key: 'landlord', Icon: Building2 },
  { key: 'venue', Icon: Dumbbell },
  { key: 'employer', Icon: Store },
];
const STEPS = ['s1', 's2', 's3'] as const;
const FAQ = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

const SECTION = 'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10';
const H2 = 'text-2xl font-semibold text-fg';

export async function LandingPage() {
  const t = await getTranslations('web.marketing');
  const tc = await getTranslations('common');
  const locale = asLocale(await getLocale());
  const [latest, stats] = await Promise.all([getLatestListings(), getLandingStats()]);

  return (
    <>
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Organization', name: APP_NAME, url: publicEnv.siteUrl },
          {
            '@context': 'https://schema.org',
            '@type': 'MobileApplication',
            name: APP_NAME,
            operatingSystem: 'iOS, Android',
            applicationCategory: 'LifestyleApplication',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((q) => ({
              '@type': 'Question',
              name: t(`faq.${q}.q`),
              acceptedAnswer: { '@type': 'Answer', text: t(`faq.${q}.a`) },
            })),
          },
        ]}
      />

      <section className="bg-primary-light">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-12 lg:flex-row lg:justify-between">
          <div className="flex max-w-xl flex-col gap-4">
            <h1 className="text-3xl font-bold text-fg">{t('hero.title')}</h1>
            <p className="text-lg text-fg">{t('hero.subtitle')}</p>
            <div className="flex flex-wrap gap-2">
              <TrackedLink href="/" event="cta_web_start" eventProps={{ from: 'hero' }} className={buttonVariants({ size: 'lg' })}>
                {t('hero.cta_web')}
              </TrackedLink>
              <TrackedLink
                href="/tai-app"
                event="cta_store_click"
                eventProps={{ from: 'hero' }}
                className={buttonVariants({ size: 'lg', variant: 'outline' })}
              >
                {t('hero.cta_app')}
              </TrackedLink>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <QrCode value={absoluteUrl(qrPath('hero'), locale)} label={t('download.qr_label')} className="size-24" />
              <p className="text-sm text-muted">{t('hero.qr_hint')}</p>
            </div>
          </div>
          <PhoneMockup label={t('hero.mockup_label')} />
        </div>
      </section>

      <section aria-labelledby="landing-services" className={SECTION}>
        <h2 id="landing-services" className={H2}>
          {t('services_title')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_PAGES.map(({ slug, feature }) => {
            const { Icon, soft, fg } = SERVICE_VISUALS[feature];
            return (
              <li key={slug}>
                <Link
                  href={`/tinh-nang/${slug}`}
                  className="flex h-full items-start gap-3 rounded-lg bg-surface p-4 shadow-card outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
                >
                  <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-md', soft, fg)}>
                    <Icon strokeWidth={1.75} className="size-6" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-md font-semibold text-fg">{t(`features.${feature}.title`)}</span>
                    <span className="text-md text-muted">{t(`features.${feature}.summary`)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="landing-latest" className={SECTION}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="landing-latest" className={H2}>
            {t('latest_title')}
          </h2>
          <Link href="/tin" className="inline-flex min-h-11 items-center text-md font-medium text-primary">
            {t('latest_all')}
          </Link>
        </div>
        {latest && latest.items.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {latest.items.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} now={latest.now} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-md text-muted">{t('latest_error')}</p>
        )}
      </section>

      <section aria-labelledby="landing-how" className="bg-surface-2">
        <div className={SECTION}>
          <h2 id="landing-how" className={H2}>
            {t('how_title')}
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-md font-bold text-on-primary"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-md font-semibold text-fg">{t(`how.${step}.title`)}</h3>
                  <p className="text-md text-fg">{t(`how.${step}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="landing-safety" className={SECTION}>
        <h2 id="landing-safety" className={H2}>
          {t('safety_title')}
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {SAFETY.map(({ key, Icon }) => (
            <li key={key} className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-card">
              <Icon aria-hidden strokeWidth={1.75} className="size-6 text-primary" />
              <h3 className="text-md font-semibold text-fg">{t(`safety.${key}.title`)}</h3>
              <p className="text-md text-muted">{t(`safety.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {stats ? (
        <section aria-labelledby="landing-stats" className={SECTION}>
          <h2 id="landing-stats" className={H2}>
            {t('stats_title')}
          </h2>
          <dl className="grid grid-cols-3 gap-3">
            {(['users', 'listings', 'sites'] as const).map((key) => (
              <div key={key} className="flex flex-col-reverse items-center gap-1 rounded-lg bg-surface p-4 text-center shadow-card">
                <dt className="text-sm text-muted">{tc(`home.stats.${key}`)}</dt>
                <dd className="text-2xl font-bold text-primary">{formatNumber(stats[key], locale)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="landing-partners" className="bg-surface-2">
        <div className={cn(SECTION, 'lg:grid lg:grid-cols-2 lg:items-start')}>
          <div className="flex flex-col gap-4">
            <h2 id="landing-partners" className={H2}>
              {t('partners_title')}
            </h2>
            <p className="text-md text-fg">{t('partners_subtitle')}</p>
            <ul className="flex flex-col gap-3">
              {PARTNERS.map(({ key, Icon }) => (
                <li key={key} className="flex items-start gap-3">
                  <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-md font-semibold text-fg">{t(`partners.${key}.title`)}</h3>
                    <p className="text-md text-fg">{t(`partners.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/cho-chu-tro" className="inline-flex min-h-11 items-center text-md font-medium text-primary">
              {t('partners_cta')}
            </Link>
          </div>
          <LeadSection source="landing" defaultKind="landlord" />
        </div>
      </section>

      <section aria-labelledby="landing-faq" className={SECTION}>
        <h2 id="landing-faq" className={H2}>
          {t('faq_title')}
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((q) => (
            <details key={q} className="group rounded-lg bg-surface p-4 shadow-card">
              <summary className="flex min-h-11 cursor-pointer items-center text-md font-semibold text-fg">
                {t(`faq.${q}.q`)}
              </summary>
              <p className="text-md text-fg">{t(`faq.${q}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-primary">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-10">
          <h2 className="text-2xl font-semibold text-on-primary">{t('cta_title')}</h2>
          <p className="text-md text-on-primary">{t('cta_body')}</p>
          <div className="flex flex-wrap gap-2">
            <TrackedLink href="/" event="cta_web_start" eventProps={{ from: 'footer_cta' }} className={buttonVariants({ size: 'lg', variant: 'accent' })}>
              {t('hero.cta_web')}
            </TrackedLink>
            <TrackedLink
              href="/tai-app"
              event="cta_store_click"
              eventProps={{ from: 'footer_cta' }}
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              {t('hero.cta_app')}
            </TrackedLink>
          </div>
        </div>
      </section>
    </>
  );
}
