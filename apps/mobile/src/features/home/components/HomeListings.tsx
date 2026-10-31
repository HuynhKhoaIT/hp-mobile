// Các dải tin của Hub theo thứ tự §3: "Gần {khu}" (luôn hiện; rỗng → thẻ mời đăng gọn) → "Dành cho bạn" (chỉ khi có
// mối quan tâm) → 4 dải theo dịch vụ (rỗng → ẩn). Cả Hub chưa có tin nào → một EmptyState thay cho mọi dải (§5).
import { MapPin, Plus, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { usePostListing } from '@/features/listing/hooks';
import { LISTING_ROUTE_SLUG, openListingList } from '@/features/listing/navigation';
import { EmptyState } from '@/ui';
import type { HomeSite, useHomeRails } from '../hooks';
import { HomeRail } from './HomeRail';

export function HomeListings({ site, rails }: { site: HomeSite; rails: ReturnType<typeof useHomeRails> }) {
  const { t } = useTranslation();
  const post = usePostListing();
  const siteCode = site.site?.code;

  if (rails.allEmpty) {
    return (
      <EmptyState
        title={t('home.empty_title')}
        description={t('home.empty_body')}
        action={{ label: t('actions.post'), icon: Plus, onPress: post }}
      />
    );
  }

  return (
    <View className="gap-6">
      <HomeRail
        rail="near"
        title={site.site ? t('home.near_title', { site: site.site.name }) : site.isLoading ? null : t('home.latest_title')}
        icon={{ icon: MapPin, tone: 'primary' }}
        items={rails.near.items}
        isLoading={site.isLoading || rails.near.isLoading}
        isError={site.isError || rails.near.isError}
        errorCode={rails.near.error?.code}
        onRetry={() => void (site.isError ? site.refetch() : rails.near.refetch())}
        onSeeAll={() => openListingList('all', siteCode ? { site: siteCode } : {})}
        priorityCount={4}
        empty={
          <EmptyState
            compact
            title={t('home.empty_title')}
            description={t('listing:list.empty_body')}
            action={{ label: t('actions.post'), icon: Plus, onPress: post }}
          />
        }
      />

      {rails.forYou.enabled ? (
        <HomeRail
          rail="for_you"
          title={t('home.for_you_title')}
          subtitle={t('home.for_you_hint')}
          icon={{ icon: Sparkles, tone: 'accent' }}
          items={rails.forYou.items}
          isLoading={rails.forYou.isLoading}
          isError={rails.forYou.isError}
          errorCode={rails.forYou.error?.code}
          onRetry={() => void rails.forYou.refetch()}
          onSeeAll={() => openListingList('all', { categories: rails.forYou.categories })}
        />
      ) : null}

      {rails.features.map(({ feature, query }) => (
        <HomeRail
          key={feature}
          rail={feature}
          title={t(`feature.${feature}`)}
          icon={{ service: feature }}
          items={query.items}
          isLoading={query.isLoading}
          isError={query.isError}
          errorCode={query.error?.code}
          onRetry={() => void query.refetch()}
          onSeeAll={() => openListingList(LISTING_ROUTE_SLUG[feature], {})}
        />
      ))}
    </View>
  );
}
