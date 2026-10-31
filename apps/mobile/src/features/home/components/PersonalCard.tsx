// Thẻ cá nhân (§4.5, §10) — một biến thể theo thứ tự: khách → chưa hoàn thiện hồ sơ → có tin → chưa có tin.
// "Tin của bạn": 3 cột số (đang đăng · chờ duyệt · lượt xem), dòng cảnh báo sắp hết hạn → Tin của tôi tab Đang đăng,
// bị từ chối → tab Chờ duyệt; hai nút chia đôi: Đăng tin (accent) + Quản lý tin (outline), cao 44.
// Đang tải → khung chờ đúng hình thẻ; lỗi → ErrorState gọn ở khối này.
import { router } from 'expo-router';
import { LogIn, PackagePlus, Plus, UserRoundPen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { track } from '@/core/analytics';
import { requireAuth } from '@/core/auth';
import { usePostListing } from '@/features/listing/hooks';
import { openMyListings } from '@/features/listing/navigation';
import { formatNumber } from '@/lib/format';
import { AlertRow, Button, ErrorState, PromoCard, Skeleton, StatColumns, Text, toast } from '@/ui';
import { type PersonalCardKind, usePersonalCard } from '../hooks';

export function PersonalCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const card = usePersonalCard();
  const post = usePostListing();
  const cta = (kind: PersonalCardKind, action: string, run: () => void) => () => {
    track('home_card_cta', { card: kind, action });
    run();
  };

  if (card.isError) {
    return <ErrorState compact className={className} title={t('home.section_error')} code={card.errorCode} onRetry={card.refetch} />;
  }
  if (card.isLoading || card.kind === null) return <PersonalCardSkeleton className={className} />;

  switch (card.kind) {
    case 'guest':
      return (
        <PromoCard
          className={className}
          icon={LogIn}
          title={t('home.card.guest_title')}
          body={t('home.card.guest_body')}
          action={{
            label: t('auth:sign_in'),
            onPress: cta('guest', 'sign_in', () => requireAuth(() => toast.show(t('auth:signed_in'), 'success'))),
          }}
        />
      );
    case 'onboarding':
      return (
        <PromoCard
          className={className}
          icon={UserRoundPen}
          title={t('home.card.onboarding_title')}
          body={t('home.card.onboarding_body')}
          action={{ label: t('home.card.onboarding_cta'), onPress: cta('onboarding', 'complete', () => router.push('/onboarding')) }}
        />
      );
    case 'first_post':
      return (
        <PromoCard
          className={className}
          icon={PackagePlus}
          title={t('home.card.first_post_title')}
          body={t('home.card.first_post_body')}
          action={{ label: t('actions.post'), icon: Plus, variant: 'accent', onPress: cta('first_post', 'post', post) }}
        />
      );
    case 'mine': {
      const s = card.stats;
      if (!s) return null;
      return (
        <View className={['gap-3 rounded-xl bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
          <Text variant="label" weight="semibold" accessibilityRole="header">
            {t('home.card.mine_title')}
          </Text>
          <StatColumns
            className="py-1"
            items={[
              { value: formatNumber(s.active), label: t('home.card.active') },
              { value: formatNumber(s.pending), label: t('home.card.pending'), tone: s.pending > 0 ? 'warning' : 'default' },
              { value: formatNumber(s.total_views), label: t('home.card.views') },
            ]}
          />
          {s.expiring_soon > 0 ? (
            <AlertRow
              tone="warning"
              label={t('home.card.expiring', { count: s.expiring_soon })}
              onPress={cta('mine', 'expiring', () => openMyListings('active'))}
            />
          ) : null}
          {s.rejected > 0 ? (
            <AlertRow
              tone="danger"
              label={t('home.card.rejected', { count: s.rejected })}
              onPress={cta('mine', 'rejected', () => openMyListings('pending'))}
            />
          ) : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button fullWidth size="sm" variant="accent" icon={Plus} label={t('actions.post')} onPress={cta('mine', 'post', post)} />
            </View>
            <View className="flex-1">
              <Button fullWidth size="sm" variant="outline" label={t('home.card.manage')} onPress={cta('mine', 'manage', () => openMyListings())} />
            </View>
          </View>
        </View>
      );
    }
  }
}

/** Khung chờ đúng hình thẻ "Tin của bạn" (tiêu đề · 3 cột số · 2 nút). */
function PersonalCardSkeleton({ className }: { className?: string }) {
  return (
    <View className={['gap-3 rounded-xl bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
      <Skeleton className="h-5 w-1/3" />
      <View className="flex-row py-1">
        {[0, 1, 2].map((i) => (
          <View key={i} className={['flex-1 items-center gap-2 px-2', i > 0 ? 'border-l border-border' : ''].join(' ')}>
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-4 w-16" />
          </View>
        ))}
      </View>
      <View className="flex-row gap-3">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </View>
    </View>
  );
}
