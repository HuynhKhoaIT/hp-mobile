// Screen type: Form
// Đăng yêu cầu gọi thợ (`/request/new?trade=` chọn sẵn loại thợ) hoặc sửa yêu cầu (`?id=`, chủ, chưa có báo giá). Cần đăng
// nhập: khách vào thẳng route này → mời đăng nhập (SignInPrompt); nút Đăng việc ở thanh tab đã bọc requireAuth. Giữ màu Gọi thợ.
import { useSession } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { MiniAppGate } from '@/features/home/components/MiniAppGate';
import { RequestForm } from '@/features/tho/form/RequestForm';
import { backOrHome } from '@/features/tho/navigation';
import { isServiceTrade } from '@/features/tho/trades';
import { AppThemeProvider, Header, Screen } from '@/ui';

export default function NewRequestScreen() {
  const { t } = useTranslation('tho');
  const { id, trade } = useLocalSearchParams<{ id?: string; trade?: string }>();
  const session = useSession();

  return (
    <MiniAppGate code="goiTho">
      <AppThemeProvider theme="goiTho">
        <Screen keyboard>
          <Header title={t(id ? 'form.title_edit' : 'form.title_new')} back onBack={backOrHome} />
          {!session.isLoading && !session.userId ? (
            <SignInPrompt />
          ) : (
            <RequestForm requestId={id} trade={isServiceTrade(trade) ? trade : undefined} />
          )}
        </Screen>
      </AppThemeProvider>
    </MiniAppGate>
  );
}
