// Header xanh của mini-app (MiniAppHeader của @/ui) theo màn — style Stitch:
//   MiniHomeHeader (trang chủ chợ): nút viên "← {APP_NAME} Super App" (rời mini-app) · phải: tim → tab Đã lưu, chuông
//     thông báo (số chưa đọc; khách → đăng nhập) → ô icon cam + tên mini-app + nhãn MINI-APP + dòng phụ → chip khu (sheet
//     chọn khu — cùng khu với Hub; đang lọc theo khu thì chuyển bộ lọc sang khu mới) → ô tìm kiếm (Tìm → lọc trong tính
//     năng + lưu lịch sử tìm kiếm).
//   MiniTabHeader (các tab khác): nút viên "← {tab trang chủ}" (về trang chủ mini-app) + tiêu đề màn (viên cam số đếm,
//     eyebrow, vùng phải, children tuỳ màn).
//   Bố cục 'directory' (Nhà trọ, Stitch "Nhà Trọ Dung Quất"): phải = viên nhãn (`home.badgeKey`) + chuông (không tim, không
//     ô icon / MINI-APP) → tên + dòng phụ → thanh rộng "Gần bạn: {khu}" + icon đổi (sheet chọn khu) → ô tìm + nút vuông
//     Bộ lọc (→ tab Bộ lọc).
// Khác Stitch (cố ý): không nút máy ảnh / quét QR trong ô tìm (chưa có tìm bằng ảnh), chấm đỏ trên icon tim (chưa có
// "tin đã lưu giảm giá").
import { useUnreadNotificationCount } from '@hp/core/react';
import { APP_NAME } from '@hp/shared';
import { Heart, SlidersHorizontal } from 'lucide-react-native';
import { View } from 'react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requireAuth } from '@/core/auth';
import { openNotifications } from '@/features/profile/navigation';
import { Badge, IconButton, MiniAppHeader, NotificationBell, OptionSheet, SearchBar, SiteChip } from '@/ui';
import { ALL, type ListingBrowserResult } from '../../hooks';
import { useMiniApp, useRecentSearches } from '../../miniApp';
import { leaveMiniApp, openMiniTab } from '../../navigation';

export function MiniHomeHeader({ browser }: { browser: ListingBrowserResult }) {
  const { t } = useTranslation('listing');
  const mini = useMiniApp();
  const { config } = mini;
  const recent = useRecentSearches(config.slug);
  const unread = useUnreadNotificationCount();
  const count = unread.data ?? 0;
  const [sheet, setSheet] = useState(false);
  const feature = t(config.titleKey);
  const home = config.miniApp.home;
  const directory = home.layout === 'directory' ? home : null;
  const siteLabel = mini.site?.name ?? (mini.siteLoading ? null : t('mini_app.home.site_pick'));
  const siteA11y = mini.site ? `${t('common:home.site_label')}: ${mini.site.name}` : t('mini_app.home.site_pick');

  const bell = (
    <NotificationBell
      count={count}
      onPress={() => requireAuth(openNotifications)}
      accessibilityLabel={count > 0 ? t('common:home.notifications_unread', { count }) : t('common:home.notifications')}
    />
  );
  const search = (
    <SearchBar
      variant="elevated"
      value={browser.input}
      onChangeText={browser.setInput}
      onSubmit={(text) => {
        browser.submit(text);
        recent.add(text);
      }}
      placeholder={config.searchPlaceholderKey ? t(config.searchPlaceholderKey) : t('list.search_placeholder', { feature })}
    />
  );

  return (
    <>
      <MiniAppHeader
        back={{
          label: t('mini_app.back_super', { app: APP_NAME }),
          accessibilityLabel: t('mini_app.back_super_a11y', { app: APP_NAME }),
          onPress: leaveMiniApp,
        }}
        right={
          directory ? (
            <>
              <Badge overlay label={t(directory.badgeKey)} tone="warning" />
              {bell}
            </>
          ) : (
            <>
              <IconButton icon={Heart} variant="glass" accessibilityLabel={t('mini_app.tabs.saved')} onPress={() => openMiniTab(config.slug, 'saved')} />
              {bell}
            </>
          )
        }
        icon={directory ? undefined : config.miniApp.icon}
        title={t(config.miniApp.titleKey)}
        tag={directory ? undefined : t('mini_app.badge')}
        subtitle={t(config.miniApp.subtitleKey)}
        aside={
          directory ? (
            <SiteChip
              variant="bar"
              prefix={t(directory.nearLabelKey)}
              label={siteLabel}
              onPress={() => setSheet(true)}
              accessibilityLabel={mini.site ? `${t(directory.nearLabelKey)}: ${mini.site.name}` : siteA11y}
              accessibilityHint={t('common:home.site_change')}
            />
          ) : (
            <SiteChip label={siteLabel} onPress={() => setSheet(true)} accessibilityLabel={siteA11y} accessibilityHint={t('common:home.site_change')} />
          )
        }
      >
        {directory ? (
          <View className="flex-row items-center gap-2">
            <View className="flex-1">{search}</View>
            <IconButton
              icon={SlidersHorizontal}
              variant="filled"
              tone="primary"
              accessibilityLabel={t('mini_app.filter.title')}
              onPress={() => openMiniTab(config.slug, 'filter')}
            />
          </View>
        ) : (
          search
        )}
      </MiniAppHeader>
      <OptionSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t('common:home.site_sheet_title')}
        hint={t('common:home.site_sheet_hint')}
        value={mini.site?.code ?? null}
        options={mini.sites.map((s) => ({ value: s.code, label: s.name }))}
        onChange={(code) => {
          mini.changeSite(code);
          // Đang lọc theo khu (chip "Gần {khu}" / điểm nóng) → lọc theo khu mới.
          if (browser.site !== ALL) browser.setSite(code);
        }}
      />
    </>
  );
}

export type MiniTabHeaderProps = {
  title: string;
  badge?: string;
  eyebrow?: string;
  right?: ReactNode;
  children?: ReactNode;
};

export function MiniTabHeader({ title, badge, eyebrow, right, children }: MiniTabHeaderProps) {
  const { t } = useTranslation('listing');
  const { config } = useMiniApp();
  return (
    <MiniAppHeader
      back={{
        label: t(config.miniApp.homeTabKey),
        accessibilityLabel: `${t('common:actions.back')}: ${t(config.miniApp.homeTabKey)}`,
        onPress: () => openMiniTab(config.slug, 'index'),
      }}
      eyebrow={eyebrow}
      title={title}
      badge={badge}
      right={right}
    >
      {children}
    </MiniAppHeader>
  );
}
