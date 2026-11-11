// Layout
// Mini-app của một tính năng Listing (config.miniApp — Pass đồ → "Chợ Pass Đồ", Stitch "Sub-App Chợ Pass"): thanh tab riêng
// thay thanh tab super app: [Chợ Pass] · Đã lưu · (nút cam Đăng tin — không phải route: bắt đăng nhập → chọn danh mục của
// tính năng, như usePostListing) · Chat (số hội thoại chưa đọc của mọi dịch vụ) · Quản lý tin. Màn Bộ lọc (`filter`) là tab
// không có ô trên thanh (ô trang chủ sáng) nên thanh tab vẫn hiện. Chi tiết tin / chat / sửa tin mở chồng lên (Stack gốc),
// không có thanh tab — khớp Stitch.
// Tham số: feature lạ → Hub; tính năng không có miniApp → danh sách listings/[feature]. `?site=` / `?shortcut=` /
// `?categories=` (Hub, link web /pass-do, banner) → bộ lọc đặt sẵn của phiên mini-app (useMiniSession — mỗi lần mở là
// phiên mới, bộ lọc dùng chung trang chủ + Bộ lọc). Khu đang chọn: useHomeSite của Hub (đổi ở đây là đổi cả Hub).
// Back Android: tab khác → trang chủ mini-app (backBehavior firstRoute); trang chủ → rời mini-app (Stack gốc).
// Realtime hộp thư: useInboxRealtime ở layout tab của super app (vẫn mount bên dưới); mở thẳng từ link thì số chưa đọc
// làm mới theo staleTime.
import { useUnreadConversationCount } from '@hp/core/react';
import { unreadBadge } from '@hp/shared';
import { Redirect, useGlobalSearchParams, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { Archive, Heart, MessagesSquare, Plus, Store } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LISTING_CONFIGS_BY_SLUG } from '@/features/configs';
import { useHomeSite } from '@/features/home/hooks';
import { useListingPreset, usePostListing } from '@/features/listing/hooks';
import { isMiniAppConfig, type MiniAppFeatureConfig, MiniAppContext, useMiniSession } from '@/features/listing/miniApp';
import { TabBar, useScheme } from '@/ui';

const ICONS = { index: Store, saved: Heart, chat: MessagesSquare, manage: Archive };
/** Vị trí nút Đăng tin giữa các ô (sau Trang chủ, Đã lưu). */
const POST_INDEX = 2;

export default function MiniAppLayout() {
  const { feature } = useLocalSearchParams<{ feature: string }>();
  const config = LISTING_CONFIGS_BY_SLUG[feature ?? ''];
  if (!config) return <Redirect href="/" />;
  if (!isMiniAppConfig(config)) return <Redirect href={{ pathname: '/listings/[feature]', params: { feature: config.slug } }} />;
  return <MiniAppShell config={config} />;
}

function MiniAppShell({ config }: { config: MiniAppFeatureConfig }) {
  const { t } = useTranslation('listing');
  const scheme = useScheme();
  const focused = useIsFocused();
  const params = useGlobalSearchParams<{ site?: string; shortcut?: string; categories?: string }>();
  const preset = useListingPreset({ shortcut: params.shortcut, categories: params.categories });
  const session = useMiniSession(config, { site: params.site, preset });
  const homeSite = useHomeSite();
  const unread = useUnreadConversationCount();
  const post = usePostListing(config.key);

  return (
    <MiniAppContext.Provider
      value={{
        config,
        session,
        site: homeSite.site,
        sites: homeSite.sites,
        siteLoading: homeSite.isLoading,
        changeSite: homeSite.change,
      }}
    >
      <Tabs
        backBehavior="firstRoute"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <TabBar
            {...props}
            icons={ICONS}
            badges={{ chat: unreadBadge(unread.data) }}
            focusAlias={{ filter: 'index' }}
            action={{ index: POST_INDEX, label: t('mini_app.tabs.post'), icon: Plus, onPress: post }}
            accessibilityLabel={t('mini_app.tabs_a11y', { feature: t(config.miniApp.titleKey) })}
          />
        )}
      >
        <Tabs.Screen name="index" options={{ title: t(config.miniApp.homeTabKey) }} />
        <Tabs.Screen name="saved" options={{ title: t('mini_app.tabs.saved') }} />
        <Tabs.Screen name="chat" options={{ title: t('mini_app.tabs.chat') }} />
        <Tabs.Screen name="manage" options={{ title: t('mini_app.tabs.manage') }} />
        <Tabs.Screen name="filter" options={{ title: t('mini_app.filter.title') }} />
      </Tabs>
      {/* Header xanh ở mọi tab: chữ / icon thanh trạng thái tương phản với primary. */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </MiniAppContext.Provider>
  );
}
