// Screen type: Form
// Góp sân mới — mở từ ô Sân của form tạo kèo (`?sport=` = môn đang chọn). Cần đăng nhập; gửi xong quay lại form kèo.
// Header xanh (ContributeVenueHero, màu dịch vụ của config ghép trận) cả khi đang tải phiên / chưa đăng nhập để màn không
// nhảy khi form hiện. Style Stitch: xem đầu ContributeVenueForm.tsx.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { GROUP_CONFIGS } from '@/features/configs';
import { ContributeVenueForm, ContributeVenueHero } from '@/features/group/form/ContributeVenueForm';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Screen, Skeleton } from '@/ui';

export default function ContributeVenueScreen() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  const session = useSession();
  const service = GROUP_CONFIGS.sport.color;

  if (!session.userId) {
    return (
      <Screen>
        <ContributeVenueHero service={service} />
        {session.isLoading ? (
          <View className="gap-3 pt-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </View>
        ) : (
          <SignInPrompt />
        )}
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <ContributeVenueForm sport={sport} service={service} />
    </Screen>
  );
}
