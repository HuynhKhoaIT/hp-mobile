// Phần trên của header Hub (§4.1): đã đăng nhập → avatar + "Chào {tên gọi}" + chuông; khách → logo chữ + Đăng nhập;
// chip khu mở sheet chọn khu (§4.1 "Chọn khu"). Ô tìm kiếm dính và đáy cong là HomeHeaderSearch / HomeHeaderCurve
// đặt ngay sau trong ScrollView của Screen.
import { useMyProfile } from '@hp/core/react';
import { APP_NAME, givenName } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SharedValue } from 'react-native-reanimated';
import { requireAuth } from '@/core/auth';
import { profileAvatarUrl } from '@/lib/images';
import { HomeHeader, OptionSheet, toast } from '@/ui';
import { type HomeSite, useHomeUnread } from '../hooks';
import { openMe, openNotifications } from '../navigation';

/** `site`: kết quả useHomeSite() của màn (một nguồn cho header và dải "Gần bạn"). */
export function HomeTopBar({ scrollY, site }: { scrollY: SharedValue<number>; site: HomeSite }) {
  const { t } = useTranslation();
  const me = useMyProfile();
  const unread = useHomeUnread();
  const [sheet, setSheet] = useState(false);
  const profile = me.data;
  const name = givenName(profile?.full_name);

  return (
    <>
      <HomeHeader
        scrollY={scrollY}
        loading={me.isLoading}
        user={
          profile
            ? {
                name: profile.full_name || '?',
                avatarUri: profileAvatarUrl(profile.avatar_url),
                onPress: openMe,
                accessibilityLabel: t('nav.me'),
              }
            : null
        }
        title={profile ? (name ? t('home.greeting', { name }) : t('home.greeting_guest')) : APP_NAME}
        subtitle={t('home.subtitle')}
        bell={{
          count: unread.count,
          onPress: openNotifications,
          accessibilityLabel: unread.count > 0 ? t('home.notifications_unread', { count: unread.count }) : t('home.notifications'),
        }}
        signIn={{ label: t('auth:sign_in'), onPress: () => requireAuth(() => toast.show(t('auth:signed_in'), 'success')) }}
        site={{
          label: site.site?.name ?? (site.isLoading ? null : t('home.site_change')),
          onPress: () => setSheet(true),
          accessibilityLabel: site.site ? `${t('home.site_label')}: ${site.site.name}` : t('home.site_change'),
          accessibilityHint: t('home.site_change'),
        }}
      />
      <OptionSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t('home.site_sheet_title')}
        hint={t('home.site_sheet_hint')}
        value={site.site?.code ?? null}
        options={site.sites.map((s) => ({ value: s.code, label: s.name }))}
        onChange={site.change}
      />
    </>
  );
}
