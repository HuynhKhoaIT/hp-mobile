// Screen type: List
// "Tin của tôi" (từ tab Tôi, kết quả đăng tin, chi tiết tin của mình): chip trạng thái có số `?tab=active|pending|draft|closed`
// → thẻ quản lý (thao tác nhanh + menu ⋮), kéo xuống làm mới, tải thêm theo cursor. Khách → mời đăng nhập. Nút Đăng nổi
// → chọn loại tin.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MyListingRowSkeleton } from '@/features/listing/components/MyListingRow';
import { isMyListingsTab, MyListings } from '@/features/listing/components/MyListings';
import { usePostListing } from '@/features/listing/hooks';
import { backOrHome } from '@/features/listing/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Col, Fab, Header, Screen } from '@/ui';

export default function MyListingsScreen() {
  const { t } = useTranslation('listing');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const session = useSession();
  const post = usePostListing();

  return (
    <Screen>
      <Header title={t('manage.title')} back onBack={backOrHome} />
      {session.isLoading ? (
        <Col gap={3} className="pt-2">
          <MyListingRowSkeleton />
          <MyListingRowSkeleton />
        </Col>
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
