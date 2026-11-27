// Screen type: Detail
// Chi tiết yêu cầu gọi thợ theo id — điều hướng nội bộ (thẻ yêu cầu), push quote_received / quote_accepted / quote_declined /
// request_cancelled / request_completed / request_expired và link web /goi-tho/yeu-cau/{id}. Mở ngay bằng dữ liệu tạm từ cache
// danh sách (useServiceRequest), rồi làm mới từ public_service_requests. Giữ màu Gọi thợ (AppThemeProvider) + cổng mini-app.
import { useServiceRequest } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MiniAppGate } from '@/features/home/components/MiniAppGate';
import { RequestDetailState } from '@/features/tho/components/RequestDetail';
import { RequestHeaderActions } from '@/features/tho/components/RequestHeaderActions';
import { backOrHome } from '@/features/tho/navigation';
import { AppThemeProvider, Header, Screen } from '@/ui';

export default function RequestDetailScreen() {
  const { t } = useTranslation('tho');
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useServiceRequest(id);

  return (
    <MiniAppGate code="goiTho">
      <AppThemeProvider theme="goiTho">
        <Screen>
          <Header
            title={t('detail.title')}
            back
            onBack={backOrHome}
            right={query.data ? <RequestHeaderActions request={query.data} /> : undefined}
          />
          <RequestDetailState query={query} />
        </Screen>
      </AppThemeProvider>
    </MiniAppGate>
  );
}
