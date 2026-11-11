// Hero tab Tôi (style Stitch, cùng kiểu header Hub): nền primary tràn lên vùng trạng thái, bo đáy rounded-b-xl, hoạ tiết
// HeroDecor của Hub. Hàng 1: tiêu đề "Tôi" đậm + chuông thông báo (NotificationBell của Hub, số chưa đọc).
// Thẻ hồ sơ trong mờ (on-primary/15, viền on-primary/20, rounded-lg p-3.5): avatar 64 viền 2 on-primary — bấm để đổi ảnh
// (ô máy ảnh nhỏ góc dưới trái; đang tải → vòng quay phủ), dấu xác minh cam góc dưới phải khi có huy hiệu; tên text-lg
// đậm (trình đọc màn hình đọc kèm "Đã xác minh"); pill khu làm việc (bỏ khi chưa chọn khu); "Tham gia {ngày}". Không hiện SĐT.
// Hai nút: Xem hồ sơ (nền surface chữ primary → hồ sơ công khai của mình) + Huy hiệu xác minh (trong mờ).
// Khách: tiêu đề + lời mời + nút Đăng nhập (requireAuth). Đang tải: khối chờ on-primary/15. Lỗi: chỉ tiêu đề (ErrorState ở màn).
import type { MyProfile } from '@hp/core';
import { Camera, Check, Eye, MapPin, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Button, HeroDecor, Icon, NotificationBell, Text, toast, useTheme } from '@/ui';
import { useAvatarChange, useSiteName, useUnreadCount } from '../hooks';
import { openBadges, openNotifications, openProfile } from '../navigation';

export type ProfileHeroProps = {
  /** Hồ sơ đã đăng nhập; null = khách. */
  profile: MyProfile | null;
  loading?: boolean;
  /** Lỗi tải hồ sơ: hero chỉ còn tiêu đề. */
  error?: boolean;
};

export function ProfileHero({ profile, loading = false, error = false }: ProfileHeroProps) {
  const { t } = useTranslation();
  return (
    <View className="rounded-b-xl bg-primary px-4 pb-5 pt-3">
      <HeroDecor rounded="rounded-b-xl" />
      <View className="min-h-12 flex-row items-center gap-3">
        <Text variant="titleLg" weight="bold" tone="onPrimary" accessibilityRole="header" className="flex-1">
          {t('nav.me')}
        </Text>
        {profile && !loading ? <HeroBell /> : null}
      </View>
      {loading ? <HeroSkeleton /> : error ? null : profile ? <HeroProfile profile={profile} /> : <HeroGuest />}
    </View>
  );
}

function HeroBell() {
  const { t } = useTranslation();
  const count = useUnreadCount();
  return (
    <NotificationBell
      count={count}
      onPress={openNotifications}
      accessibilityLabel={count > 0 ? t('home.notifications_unread', { count }) : t('home.notifications')}
    />
  );
}

function HeroProfile({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();
  const site = useSiteName(profile.site);
  const name = profile.full_name || '?';
  const verified = profile.badges.length > 0;

  return (
    <View className="mt-3 gap-3">
      <View className="flex-row items-center gap-3.5 rounded-lg border border-on-primary/20 bg-on-primary/15 p-3.5">
        <HeroAvatar profile={profile} verified={verified} />
        <View className="flex-1 gap-1">
          <Text
            variant="title"
            weight="bold"
            tone="onPrimary"
            accessibilityLabel={verified ? `${name}, ${t('profile.verified')}` : name}
          >
            {name}
          </Text>
          {site ? (
            <View className="max-w-full flex-row items-center gap-1 self-start rounded-full bg-on-primary/20 px-2.5 py-0.5">
              <Icon icon={MapPin} tone="onPrimary" size={14} />
              <Text variant="caption" weight="semibold" tone="onPrimary" className="shrink">
                {site}
              </Text>
            </View>
          ) : null}
          <Text variant="caption" tone="onPrimary" className="opacity-90">
            {t('profile.member_since', { date: formatDate(profile.created_at) })}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Button size="sm" variant="inverse" icon={Eye} label={t('profile.view')} fullWidth onPress={() => openProfile(profile.id)} />
        </View>
        <View className="flex-1">
          <Button size="sm" variant="glass" icon={ShieldCheck} label={t('badge_request.title')} fullWidth onPress={openBadges} />
        </View>
      </View>
    </View>
  );
}

/** Avatar bấm để đổi ảnh (useAvatarChange: chọn + cắt vuông + nén + tải lên); lỗi → toast. */
function HeroAvatar({ profile, verified }: { profile: MyProfile; verified: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const errorText = useErrorText();
  const avatar = useAvatarChange(profile.id, (code) => toast.show(errorText(code), 'danger'));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(profile.avatar_url ? 'auth:onboarding.avatar_change' : 'auth:onboarding.avatar_pick')}
      accessibilityState={{ busy: avatar.isPending, disabled: avatar.isPending }}
      disabled={avatar.isPending}
      onPress={avatar.choose}
      hitSlop={4}
      className="active:opacity-80"
    >
      <View className="rounded-full border-2 border-on-primary">
        <Avatar uri={profileAvatarUrl(profile.avatar_url)} name={profile.full_name || '?'} size="lg" />
      </View>
      {avatar.isPending ? (
        <View className="absolute inset-0 items-center justify-center rounded-full bg-primary/60">
          <ActivityIndicator color={theme.colors.onPrimary} />
        </View>
      ) : null}
      <View className="absolute -bottom-0.5 -left-0.5 size-6 items-center justify-center rounded-full border-2 border-primary bg-surface">
        <Icon icon={Camera} tone="primary" size={12} />
      </View>
      {verified ? (
        <View className="absolute -bottom-0.5 -right-0.5 size-6 items-center justify-center rounded-full border-2 border-primary bg-accent">
          <Icon icon={Check} tone="onAccent" size={14} strong />
        </View>
      ) : null}
    </Pressable>
  );
}

function HeroGuest() {
  const { t } = useTranslation();
  return (
    <View className="mt-1 gap-4">
      <Text tone="onPrimary" className="opacity-90">
        {t('auth:dialog.description')}
      </Text>
      <Button variant="inverse" shape="pill" label={t('auth:sign_in')} onPress={() => requireAuth()} />
    </View>
  );
}

function HeroSkeleton() {
  return (
    <View className="mt-3 gap-3">
      <View className="flex-row items-center gap-3.5 rounded-lg border border-on-primary/20 bg-on-primary/15 p-3.5">
        <View className="size-16 rounded-full bg-on-primary/15" />
        <View className="flex-1 gap-2">
          <View className="h-5 w-1/2 rounded-full bg-on-primary/15" />
          <View className="h-4 w-1/3 rounded-full bg-on-primary/15" />
          <View className="h-4 w-2/3 rounded-full bg-on-primary/15" />
        </View>
      </View>
      <View className="flex-row gap-2.5">
        <View className="h-11 flex-1 rounded-md bg-on-primary/15" />
        <View className="h-11 flex-1 rounded-md bg-on-primary/15" />
      </View>
    </View>
  );
}
