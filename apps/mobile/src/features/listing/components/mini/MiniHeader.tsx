// Header xanh của mini-app (MiniAppHeader của @/ui) theo màn — style Stitch:
//   MiniHomeHeader (trang chủ chợ): nút viên "← {APP_NAME} Super App" (rời mini-app) · phải: tim → tab Đã lưu, chuông
//     thông báo (số chưa đọc; khách → đăng nhập) → ô icon cam + tên mini-app + nhãn MINI-APP + dòng phụ → chip khu (sheet
//     chọn khu — cùng khu với Hub; đang lọc theo khu thì chuyển bộ lọc sang khu mới) → ô tìm kiếm (Tìm → lọc trong tính
//     năng + lưu lịch sử tìm kiếm).
//   MiniTabHeader (các tab khác): nút viên "← {tab trang chủ}" (về trang chủ mini-app) + tiêu đề màn (viên cam số đếm,
//     eyebrow, vùng phải, children tuỳ màn).
// Khác Stitch (cố ý): không nút máy ảnh / quét QR trong ô tìm (chưa có tìm bằng ảnh), chấm đỏ trên icon tim (chưa có
// "tin đã lưu giảm giá").
import { useUnreadNotificationCount } from '@hp/core/react';
import { APP_NAME } from '@hp/shared';
import { Heart } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requireAuth } from '@/core/auth';
import { openNotifications } from '@/features/profile/navigation';
import { IconButton, MiniAppHeader, NotificationBell, OptionSheet, SearchBar, SiteChip } from '@/ui';
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

  return (
    <>
      <MiniAppHeader
        back={{
          label: t('mini_app.back_super', { app: APP_NAME }),
          accessibilityLabel: t('mini_app.back_super_a11y', { app: APP_NAME }),
          onPress: leaveMiniApp,
        }}
        right={
          <>
            <IconButton icon={Heart} variant="glass" accessibilityLabel={t('mini_app.tabs.saved')} onPress={() => openMiniTab(config.slug, 'saved')} />
            <NotificationBell
              count={count}
              onPress={() => requireAuth(openNotifications)}
              accessibilityLabel={count > 0 ? t('common:home.notifications_unread', { count }) : t('common:home.notifications')}
            />
          </>
        }
        icon={config.miniApp.icon}
        title={t(config.miniApp.titleKey)}
        tag={t('mini_app.badge')}
        subtitle={t(config.miniApp.subtitleKey)}
        aside={
          <SiteChip
            label={mini.site?.name ?? (mini.siteLoading ? null : t('mini_app.home.site_pick'))}
            onPress={() => setSheet(true)}
            accessibilityLabel={mini.site ? `${t('common:home.site_label')}: ${mini.site.name}` : t('mini_app.home.site_pick')}
            accessibilityHint={t('common:home.site_change')}
          />
        }
      >
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
