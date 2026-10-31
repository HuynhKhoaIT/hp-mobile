// Screen type: List
// "Tin của tôi" (từ tab Tôi, kết quả đăng tin, chi tiết tin của mình): tab trạng thái `?tab=active|pending|draft|closed`.
// Khách → mời đăng nhập. Nút Đăng nổi → chọn loại tin.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { isMyListingsTab, MyListings } from '@/features/listing/components/MyListings';
import { usePostListing } from '@/features/listing/hooks';
import { backOrHome } from '@/features/listing/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Fab, Header, Screen, SkeletonListingCard } from '@/ui';

export default function MyListingsScreen() {
  const { t } = useTranslation('listing');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const session = useSession();
  const post = usePostListing();

  return (
    <Screen>
      <Header title={t('manage.title')} back onBack={backOrHome} />
      {session.isLoading ? (
        <SkeletonListingCard count={4} layout="row" />
      ) : !session.userId ? (
        <SignInPrompt />
      ) : (
        <>
          <MyListings key={tab ?? ''} initialTab={isMyListingsTab(tab) ? tab : 'active'} />
          <Fab label={t('list.post_cta')} icon={Plus} onPress={post} />
        </>
      )}
    </Screen>
  );
}
