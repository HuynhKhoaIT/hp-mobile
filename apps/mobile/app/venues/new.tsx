// Screen type: Form
// Góp sân mới — mở từ ô Sân của form tạo kèo (`?sport=` = môn đang chọn). Cần đăng nhập; gửi xong quay lại form kèo.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ContributeVenueForm } from '@/features/group/form/ContributeVenueForm';
import { backOrHome } from '@/features/group/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Header, Screen, Skeleton } from '@/ui';

export default function ContributeVenueScreen() {
  const { t } = useTranslation('group');
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  const session = useSession();

  if (!session.userId) {
    return (
      <Screen>
        <Header title={t('venue.contribute_title')} back onBack={backOrHome} />
        {session.isLoading ? <Skeleton className="h-48 w-full rounded-md" /> : <SignInPrompt />}
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <ContributeVenueForm sport={sport} />
    </Screen>
  );
}
