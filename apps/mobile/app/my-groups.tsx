// Screen type: List
// "Nhóm của tôi" (từ tab Tôi): tab `?tab=upcoming|past` — chuyến / kèo mình tạo, đã tham gia, đang chờ duyệt; nhóm đã qua
// mời đánh giá chủ nhóm. Khách → mời đăng nhập.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isMyGroupsTab, MyGroups } from '@/features/group/components/MyGroups';
import { backOrHome } from '@/features/group/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Header, Screen, SkeletonGroupCard } from '@/ui';

export default function MyGroupsScreen() {
  const { t } = useTranslation('group');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const session = useSession();

  return (
    <Screen>
      <Header title={t('mine.title')} back onBack={backOrHome} />
      {session.isLoading ? (
        <SkeletonGroupCard count={3} />
      ) : !session.userId ? (
        <SignInPrompt />
      ) : (
        <MyGroups key={tab ?? ''} initialTab={isMyGroupsTab(tab) ? tab : 'upcoming'} />
      )}
    </Screen>
  );
}
