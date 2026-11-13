// Trang con của mini-app (dùng chung mọi tính năng có config.miniApp — route chỉ truyền `feature`). Khung mỗi trang gắn
// data-app-theme (config.miniApp.theme) → header gradient, dải tab, form, khung chat theo màu mini-app.
// - MiniAppFilterPage (/…/bo-loc, công khai): header (← trang chủ, "Bộ lọc & tìm kiếm", "Đặt lại") + form GET. Khung tĩnh có
//   form trống (fallback của <Suspense>, khu cache theo giờ); phần đọc searchParams (điền sẵn bộ lọc đang dùng) theo request.
// - MiniAppSavedPage (/…/da-luu), MiniAppChatPage (/…/tin-nhan), MiniAppManagePage (/…/quan-ly?tab=): cần đăng nhập
//   (proxy.ts — MINI_APP_PRIVATE_PATHS), noindex; dữ liệu riêng đọc ở trình duyệt qua hook @hp/core/react (khung tĩnh =
//   skeleton). Tab của "Quản lý tin" đọc searchParams trong <Suspense>.
// - MiniAppPostPage (/…/dang-tin): form "Đăng nhanh" dùng chung, khoá tính năng (chỉ danh mục của nó) — header xanh của
//   form thay header mini-app (từ 640px vẫn có dải tab mini-app phía trên); huỷ về trang chủ mini-app, đăng xong về "Quản lý
//   tin". Cần đăng nhập, noindex.
// - MiniAppEditPage (/…/quan-ly/[id]/sua): cùng form ở chế độ sửa, `scope` của mini-app (huỷ / xong → "Quản lý tin" của
//   mini-app, "Đăng tin khác" → trang đăng của mini-app); tin thuộc tính năng khác → 404. Cần đăng nhập, noindex.
// - MiniAppThreadPage (/…/tin-nhan/[id]): khung chat dùng chung (ChatThread) trong khung mini-app — nút quay lại về hộp thư
//   của mini-app; < 640px phủ toàn màn hình như /tin-nhan/[id], từ 640px nằm dưới dải tab mini-app. Cần đăng nhập, noindex.
import type { ListingFeature } from '@hp/shared';
import { SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { ThreadSkeleton } from '@/features/chat/components/chat-skeletons';
import { ConversationList } from '@/features/chat/components/conversation-list';
import { ThreadFromParams } from '@/features/chat/components/thread-from-params';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '../../display';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import { filterQuery, type ListFilterState, NO_FILTERS, parseListFilters } from '../../filters';
import { parseFeatureTab } from '../../manage';
import { isMiniApp, type MiniAppConfig } from '../../mini-app';
import { getPublicSites } from '../../queries';
import { scopeInfo } from '../../scope';
import type { ListingFormScope } from '../listing-form/listing-form';
import { EditListingView, ListingFormSkeleton, PostListingView } from '../post-listing-view';
import { MINI_APP_HEADER_ACTION, MiniAppPageHeader } from './mini-app-header';
import { MiniAppFilterForm } from './mini-app-filter-form';
import { MiniAppManageCount, MiniAppManageView } from './mini-app-manage-view';
import { MiniAppTabStrip } from './mini-app-nav';
import { MiniAppSavedCount, MiniAppSavedView } from './mini-app-saved-view';

type RawParams = Record<string, string | string[] | undefined>;

const FRAME = 'mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6';
const BODY = 'flex flex-col gap-4 px-4 sm:px-0';

function miniAppOf(feature: ListingFeature): MiniAppConfig {
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  if (!isMiniApp(cfg)) throw new Error(`${feature} is not a mini-app`);
  return cfg;
}

/** Form đăng / sửa tin trong mini-app: khoá tính năng + đường về của mini-app. */
function formScopeOf(cfg: MiniAppConfig): ListingFormScope {
  const { paths } = cfg.miniApp;
  return { feature: cfg.feature, homeHref: paths.home, manageHref: paths.manage, postHref: paths.post };
}

// ── Bộ lọc & tìm kiếm ─────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppFilterPage({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section data-app-theme={cfg.miniApp.theme} className={FRAME}>
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
    <section data-app-theme={cfg.miniApp.theme} className={FRAME}>
      <MiniAppPageHeader
        cfg={cfg}
        eyebrow={t(cfg.miniApp.titleKey)}
        title={t('listing.mini_app.saved.title')}
        titleAside={<MiniAppSavedCount feature={feature} />}
      />
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
    <section data-app-theme={cfg.miniApp.theme} className={FRAME}>
      <MiniAppPageHeader cfg={cfg} eyebrow={t(cfg.miniApp.titleKey)} title={t('listing.mini_app.tabs.chat')} />
      <div className="flex flex-col sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
        <ConversationList selectedId={null} lockFeature={feature} emptyHref={cfg.path} threadBase={cfg.miniApp.paths.chat} bare />
      </div>
    </section>
  );
}

export function MiniAppThreadPage({ feature, params }: { feature: ListingFeature; params: Promise<{ conversationId: string }> }) {
  const { miniApp } = miniAppOf(feature);
  return (
    <section data-app-theme={miniApp.theme} className={FRAME}>
      <MiniAppTabStrip feature={feature} />
      <div className="flex flex-col bg-surface max-sm:fixed max-sm:inset-0 max-sm:z-50 sm:h-chat-panel sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
        <Suspense fallback={<ThreadSkeleton />}>
          <ThreadFromParams params={params} inboxHref={miniApp.paths.chat} />
        </Suspense>
      </div>
    </section>
  );
}

// ── Quản lý tin ────────────────────────────────────────────────────────────────────────────────────────────────

export async function MiniAppManagePage({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section data-app-theme={cfg.miniApp.theme} className={FRAME}>
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

// ── Đăng tin ──────────────────────────────────────────────────────────────────────────────────────────────────

const FORM_FRAME = 'mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6';

export function MiniAppPostPage({ feature, searchParams }: { feature: ListingFeature; searchParams: Promise<RawParams> }) {
  const cfg = miniAppOf(feature);
  return (
    <section data-app-theme={cfg.miniApp.theme} className={FORM_FRAME}>
      <MiniAppTabStrip feature={feature} />
      <Suspense fallback={<ListingFormSkeleton />}>
        <PostListingView searchParams={searchParams} scope={formScopeOf(cfg)} />
      </Suspense>
    </section>
  );
}

// ── Sửa tin ───────────────────────────────────────────────────────────────────────────────────────────────────

export function MiniAppEditPage({ feature, params }: { feature: ListingFeature; params: Promise<{ id: string }> }) {
  const cfg = miniAppOf(feature);
  return (
    <section data-app-theme={cfg.miniApp.theme} className={FORM_FRAME}>
      <MiniAppTabStrip feature={feature} />
      <Suspense fallback={<ListingFormSkeleton />}>
        <EditListingView params={params} scope={formScopeOf(cfg)} />
      </Suspense>
    </section>
  );
}

/** not-found của trang sửa tin trong mini-app: tin không có / không phải của tôi / thuộc tính năng khác → về "Quản lý tin". */
export async function MiniAppEditNotFound({ feature }: { feature: ListingFeature }) {
  const cfg = miniAppOf(feature);
  const t = await getTranslations();
  return (
    <section data-app-theme={cfg.miniApp.theme} className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
      <EmptyState
        icon={SearchX}
        title={t('listing.detail.not_found_title')}
        action={
          <Button asChild>
            <Link href={cfg.miniApp.paths.manage}>{t('listing.mini_app.manage.title')}</Link>
          </Button>
        }
      />
    </section>
  );
}
