// Trang chủ mini-app (style Stitch "Sub-App Chợ Pass"), một danh sách cuộn (FlashList) — header luôn hiện kể cả khi đang
// tải / lỗi / rỗng (ListingFeed headerAlways):
//   1 header xanh (MiniHomeHeader: rời mini-app · tim · chuông · tên + MINI-APP · chip khu · ô tìm kiếm).
//   2 dải "Khu làm việc" (điểm nóng) = chip các khu (useSites) — bấm bật / tắt lọc theo khu.
//   3 (khi chưa lọc) thẻ danh mục: lưới 4 cột config.miniApp.homeCategoryCount ô đầu (icon config.categoryIcons trên nền
//     màu dịch vụ nhạt, nhãn category_short) + ô "Cho tặng" (khi config.quickFilters có freeOnly) + ô "Tất cả mục" — bấm
//     → mở rộng ngay trong thẻ ra đủ danh mục (không sang màn Bộ lọc: một chạm là thấy hết, chọn tiếp một chạm).
//   4 (khi chưa lọc) banner theo config.miniApp.bannerPlacement; chưa có banner / lỗi → khối "An tâm trao tay" (CTA → huy
//     hiệu xác minh, cần đăng nhập). Link banner về chính mini-app (`/pass-do?category=…`, `/pass-do/da-luu`…) → đặt bộ
//     lọc của phiên / chuyển tab, `/pass-do/dang-tin` → luồng đăng của mini-app (không mở chồng mini-app thứ hai); link khác
//     → openWebLink.
//   5 hàng chip nhanh: "Tất cả" (chưa lọc) hoặc "{n} bộ lọc ×" (đang lọc → bỏ hết) · bộ lọc đặt sẵn (chip "Tìm nhanh" của
//     Hub / ?categories= — nhãn như ListingBrowser, × bỏ riêng nó) · "Gần {khu}" (khu của super app) · chip lọc nhanh của
//     config (Cho tặng, tình trạng, xe máy…).
//   6 "Tin mới đăng quanh bạn" + "Lọc thêm" (→ tab Bộ lọc) → lưới 2 cột cuộn vô hạn (ListingCard, tim lưu tin; đồ cho tặng
//     hiện "Miễn phí") → dòng miễn trừ "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát".
// Kéo xuống làm mới: danh sách + banner. Đổi bộ lọc → danh sách cuộn về đầu.
// Khác Stitch (cố ý): không "1.400+ tin mới", nhãn Hot / Mới / 0đ trên ô danh mục, nhãn thẻ "Bán gấp / Thợ chính chủ /
// Mới 98%" (chưa có dữ liệu); không nút "Xem thêm 420 tin" (cuộn vô hạn thay); chip "Gần tôi (< 3km)" thành "Gần {khu}"
// (lọc theo khu làm việc, không theo GPS); chip "Đồ nghề xưởng" thay bằng chip lọc nhanh của config; chân trang không có
// link "Quy chế / Mẹo / Hỗ trợ" (chưa có trang).
import type { ListingCategory } from '@hp/shared';
import { Gift, LayoutGrid, MapPin, ShieldCheck, Tag, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { openBadges } from '@/features/profile/navigation';
import { miniAppLinkOf, openWebLink } from '@/lib/urls';
import { BannerCarousel, Card, Chip, Icon, SectionHeader, ServiceGrid, ServiceTile, Text } from '@/ui';
import {
  ALL,
  initialBrowserState,
  isFreeQuickFilter,
  type ListingBrowserResult,
  listingPresetOf,
  usePlacementBanners,
  usePostListing,
} from '../../hooks';
import { useMiniApp, useMiniBrowser, useMiniFilterState } from '../../miniApp';
import { openMiniTab } from '../../navigation';
import { ListingFeed } from '../ListingFeed';
import { PlacementBanners } from '../PlacementBanners';
import { QuickFilterChips } from '../QuickFilterChips';
import { MiniDisclaimer } from './MiniDisclaimer';
import { MiniHomeHeader } from './MiniHeader';

export function MiniHome({ active }: { active: boolean }) {
  const { t } = useTranslation('listing');
  const { config } = useMiniApp();
  const browser = useMiniBrowser();
  const banners = usePlacementBanners(config.miniApp.bannerPlacement);
  const post = usePostListing(config.key, { mini: true });
  const filtered = browser.isFiltered;
  const session = useMiniFilterState();
  const { t: tc } = useTranslation();

  /** Link banner: về chính mini-app → ở lại phiên (bộ lọc đặt sẵn / tab / đăng tin); còn lại → openWebLink. */
  const openBannerLink = (link: string) => {
    const target = miniAppLinkOf(link);
    if (!target || target.slug !== config.slug) return openWebLink(link);
    if (target.page === 'post') return post();
    if (target.page === 'index' || target.page === 'filter') {
      const preset = listingPresetOf({ categories: target.params.categories }, tc);
      session.update(() => initialBrowserState(config, { site: target.params.site, preset }));
    }
    if (target.page !== 'index') openMiniTab(config.slug, target.page);
  };

  const header = (
    <View className="gap-4">
      <MiniHomeHeader browser={browser} />
      <HotSpots browser={browser} />
      {filtered ? null : <CategoryCard browser={browser} />}
      {filtered ? null : (
        <View className="-mx-4">
          <PlacementBanners
            placement={config.miniApp.bannerPlacement}
            active={active}
            hideOnError
            fallback={<SafetyBanner active={active} />}
            onLink={openBannerLink}
          />
        </View>
      )}
      <QuickRow browser={browser} />
      <SectionHeader
        title={t('mini_app.home.latest_title')}
        bar="accent"
        size="md"
        action={{ label: t('mini_app.home.filter_more'), onPress: () => openMiniTab(config.slug, 'filter') }}
      />
    </View>
  );

  return (
    <ListingFeed
      config={config}
      items={browser.items}
      isLoading={browser.isLoading}
      isError={browser.isError}
      errorCode={browser.error?.code}
      isFiltered={filtered}
      isRefetching={browser.isRefetching}
      hasNextPage={browser.hasNextPage}
      isFetchingNextPage={browser.isFetchingNextPage}
      isFetchNextPageError={browser.isFetchNextPageError}
      fetchNextPage={() => void browser.fetchNextPage()}
      refetch={() => {
        void browser.refetch();
        void banners.refetch();
      }}
      onPost={post}
      header={header}
      headerAlways
      gutter
      footer={<MiniDisclaimer className="px-4 pb-2" />}
      listKey={JSON.stringify(browser.filters)}
    />
  );
}

/** Dải khu làm việc (điểm nóng): chip mỗi khu, bấm bật / tắt lọc theo khu. */
function HotSpots({ browser }: { browser: ListingBrowserResult }) {
  const { t } = useTranslation('listing');
  const { sites } = useMiniApp();
  if (sites.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={t('common:home.site_label')}
      className="-mx-4 grow-0"
      contentContainerClassName="items-center gap-2 px-4 py-1"
    >
      <View className="flex-row items-center gap-1">
        <Icon icon={MapPin} tone="primary" size={16} />
        <Text variant="caption" weight="semibold" tone="primary">
          {t('common:home.site_label')}
        </Text>
      </View>
      {sites.map((s) => (
        <Chip
          key={s.code}
          size="sm"
          label={s.name}
          selected={browser.site === s.code}
          onPress={() => browser.setSite(browser.site === s.code ? ALL : s.code)}
        />
      ))}
    </ScrollView>
  );
}

/** Thẻ danh mục: N ô đầu + Cho tặng + Tất cả mục (bấm → mở rộng đủ danh mục ngay trong thẻ). */
function CategoryCard({ browser }: { browser: ListingBrowserResult }) {
  const { t } = useTranslation('listing');
  const { config } = useMiniApp();
  const [expanded, setExpanded] = useState(false);
  const limit = config.miniApp.homeCategoryCount;
  const more = !expanded && config.categories.length > limit;
  const shown = more ? config.categories.slice(0, limit) : config.categories;
  const free = config.quickFilters?.find(isFreeQuickFilter);

  const tile = (c: ListingCategory) => {
    const label = t(`category_short.${c}`);
    const icon = config.categoryIcons?.[c];
    const a11y = t('feature_home.category_a11y', { category: t(`common:category.${c}`) });
    return (
      <View key={c} className="flex-1">
        {config.color ? (
          <ServiceTile variant="grid" service={config.color} icon={icon} label={label} accessibilityLabel={a11y} onPress={() => browser.setCategory(c)} />
        ) : (
          <ServiceTile variant="grid" icon={icon ?? Tag} label={label} accessibilityLabel={a11y} onPress={() => browser.setCategory(c)} />
        )}
      </View>
    );
  };

  return (
    <Card className="gap-3">
      <SectionHeader
        size="md"
        icon={{ icon: LayoutGrid, tone: 'primary' }}
        title={t('mini_app.home.categories_title', { feature: t(config.miniApp.homeTabKey) })}
      />
      <ServiceGrid columns={4}>
        {shown.map(tile)}
        {free ? (
          <View key="free" className="flex-1">
            <ServiceTile variant="grid" icon={Gift} label={t(free.labelKey)} onPress={browser.api.showFree} />
          </View>
        ) : null}
        {more ? (
          <View key="all" className="flex-1">
            <ServiceTile variant="grid" icon={LayoutGrid} label={t('mini_app.home.all_categories')} onPress={() => setExpanded(true)} />
          </View>
        ) : null}
      </ServiceGrid>
    </Card>
  );
}

/** Khối "An tâm trao tay" khi placement chưa có banner: mời xác minh (huy hiệu) để giao dịch tin cậy hơn. */
function SafetyBanner({ active }: { active: boolean }) {
  const { t } = useTranslation('listing');
  return (
    <BannerCarousel
      active={active}
      slides={[
        {
          id: 'safe',
          eyebrow: t('mini_app.home.safe_badge'),
          title: t('mini_app.home.safe_title'),
          subtitle: t('mini_app.home.safe_body'),
          ctaLabel: t('mini_app.home.safe_cta'),
          icon: ShieldCheck,
          tone: 'primary',
        },
      ]}
      onPress={() => requireAuth(openBadges)}
    />
  );
}

/** Hàng chip nhanh: Tất cả / "{n} bộ lọc ×" · bộ lọc đặt sẵn × · Gần {khu} · chip lọc nhanh của config. */
function QuickRow({ browser }: { browser: ListingBrowserResult }) {
  const { t } = useTranslation('listing');
  const { config, site } = useMiniApp();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={t('list.quick_filters')}
      className="-mx-4 grow-0"
      contentContainerClassName="gap-2 px-4 py-1"
    >
      {browser.isFiltered ? (
        <Chip
          size="sm"
          selected
          label={t('mini_app.filter.active_count', { count: browser.filterCount })}
          trailingIcon={X}
          accessibilityHint={t('list.clear_filters')}
          onPress={browser.clearAll}
        />
      ) : (
        <Chip size="sm" selected label={t('mini_app.home.chip_all')} onPress={browser.clearAll} />
      )}
      {browser.preset ? (
        <Chip
          size="sm"
          selected
          label={browser.preset.label}
          trailingIcon={X}
          accessibilityHint={t('common:actions.clear_filter')}
          onPress={browser.clearPreset}
        />
      ) : null}
      {site ? (
        <Chip
          size="sm"
          dot="accent"
          label={t('mini_app.home.chip_near', { site: site.name })}
          selected={browser.site === site.code}
          onPress={() => browser.setSite(browser.site === site.code ? ALL : site.code)}
        />
      ) : null}
      <QuickFilterChips config={config} browser={browser} />
    </ScrollView>
  );
}
