// Trang con của mini-app (dùng chung mọi tính năng có config.miniApp — route chỉ truyền `feature`):
// - MiniAppFilterPage (/…/bo-loc, công khai): header (← trang chủ, "Bộ lọc & tìm kiếm", "Đặt lại") + form GET. Khung tĩnh có
//   form trống (fallback của <Suspense>, khu cache theo giờ); phần đọc searchParams (điền sẵn bộ lọc đang dùng) theo request.
// - MiniAppSavedPage (/…/da-luu), MiniAppChatPage (/…/tin-nhan), MiniAppManagePage (/…/quan-ly?tab=): cần đăng nhập
//   (proxy.ts — MINI_APP_PRIVATE_PATHS), noindex; dữ liệu riêng đọc ở trình duyệt qua hook @hp/core/react (khung tĩnh =
//   skeleton). Tab của "Quản lý tin" đọc searchParams trong <Suspense>.
import type { ListingFeature } from '@hp/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ConversationList } from '@/features/chat/components/conversation-list';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '../../display';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import { filterQuery, type ListFilterState, NO_FILTERS, parseListFilters } from '../../filters';
import { parseFeatureTab } from '../../manage';
import { isMiniApp, type MiniAppConfig } from '../../mini-app';
import { getPublicSites } from '../../queries';
import { scopeInfo } from '../../scope';
import { MINI_APP_HEADER_ACTION, MiniAppPageHeader } from './mini-app-header';
import { MiniAppFilterForm } from './mini-app-filter-form';
import { MiniAppManageCount, MiniAppManageView } from './mini-app-manage-view';
import { MiniAppSavedView } from './mini-app-saved-view';

type RawParams = Record<string, string | string[] | undefined>;

const FRAME = 'mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6';
const BODY = 'flex flex-col gap-4 px-4 sm:px-0';

function miniAppOf(feature: ListingFeature): MiniAppConfig {
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  if (!isMiniApp(cfg)) throw new Error(`${feature} is not a mini-app`);
  return cfg;
}

// ── Bộ lọc & tìm kiếm ─────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppFilterPage({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section className={FRAME}>
      <MiniAppPageHeader
        cfg={cfg}
        title={t('listing.mini_app.filter.title')}
        aside={
          <Link href={cfg.miniApp.paths.filter} className={MINI_APP_HEADER_ACTION}>
            {t('listing.mini_app.filter.reset')}
          </Link>
        }
      />
      <div className={BODY}>
        <Suspense fallback={<FilterFormBody cfg={cfg} initial={NO_FILTERS} />}>
          <FilterFormFromParams cfg={cfg} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function FilterFormFromParams({ cfg, searchParams }: { cfg: MiniAppConfig; searchParams: Promise<RawParams> }) {
  const { categories, filterOptions } = scopeInfo(cfg.feature);
  const initial = parseListFilters(await searchParams, categories, filterOptions);
  return <FilterFormBody cfg={cfg} initial={initial} />;
}

async function FilterFormBody({ cfg, initial }: { cfg: MiniAppConfig; initial: ListFilterState }) {
  const locale = asLocale(await getLocale());
  const sites = await getPublicSites();
  return (
    <MiniAppFilterForm
      // Điều hướng mềm sang bộ lọc khác (vd "Đặt lại") → form mới với giá trị mới (ô không điều khiển).
      key={new URLSearchParams(filterQuery(initial)).toString()}
      feature={cfg.feature}
      initial={initial}
      sites={sites.map((s) => ({ code: s.code, name: s.name }))}
      action={getPathname({ href: cfg.path, locale })}
    />
  );
}

// ── Đã lưu ─────────────────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppSavedPage({ feature }: { feature: ListingFeature }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section className={FRAME}>
      <MiniAppPageHeader cfg={cfg} eyebrow={t(cfg.miniApp.titleKey)} title={t('listing.mini_app.saved.title')} />
      <div className={BODY}>
        <MiniAppSavedView feature={feature} />
      </div>
    </section>
  );
}

// ── Chat ───────────────────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppChatPage({ feature }: { feature: ListingFeature }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section className={FRAME}>
      <MiniAppPageHeader cfg={cfg} eyebrow={t(cfg.miniApp.titleKey)} title={t('listing.mini_app.tabs.chat')} />
      <div className="flex flex-col sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
        <ConversationList selectedId={null} lockFeature={feature} emptyHref={cfg.path} bare />
      </div>
    </section>
  );
}

// ── Quản lý tin ────────────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppManagePage({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section className={FRAME}>
      <MiniAppPageHeader
        cfg={cfg}
        eyebrow={t(cfg.miniApp.titleKey)}
        title={t('listing.mini_app.manage.title')}
        titleAside={<MiniAppManageCount feature={feature} />}
      />
      <div className={BODY}>
        <Suspense fallback={<MiniAppManageView feature={feature} tab={null} />}>
          <ManageFromParams feature={feature} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function ManageFromParams({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const tab = parseFeatureTab((await searchParams).tab);
  return <MiniAppManageView feature={feature} tab={tab} />;
}
