// Screen type: List
// Tab "Của tôi": yêu cầu mình đã đăng (mọi trạng thái: đang nhận báo giá / đã chọn thợ / hoàn thành / huỷ / hết hạn) kèm số báo
// giá; bấm → chi tiết (xem báo giá, chọn thợ, huỷ, xác nhận xong, đánh giá). Khách → mời đăng nhập; rỗng → "Đăng yêu cầu".
import { useMyServiceRequests, useSession } from '@hp/core/react';
import { ClipboardList } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RequestCard } from '@/features/tho/components/RequestCard';
import { RequestFeed } from '@/features/tho/components/RequestFeed';
import { ThoTabHeader } from '@/features/tho/components/ThoTabHeader';
import { useNewRequestAction } from '@/features/tho/hooks';
import { openServiceRequest } from '@/features/tho/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Screen } from '@/ui';

export default function ThoMineScreen() {
  const { t } = useTranslation('tho');
  const session = useSession();
  const mine = useMyServiceRequests();
  const newRequest = useNewRequestAction();

  return (
    <Screen tab statusBar="app">
      <ThoTabHeader title={t('mine.title')} />
      {!session.isLoading && !session.userId ? (
        <SignInPrompt />
      ) : (
        <RequestFeed
          items={mine.items}
          keyOf={(r) => r.id}
          renderItem={(r) => <RequestCard request={r} onPress={() => openServiceRequest(r.id)} />}
          isLoading={session.isLoading || mine.isLoading}
          isError={mine.isError}
          errorCode={mine.error?.code}
          isRefetching={mine.isRefetching}
          hasNextPage={mine.hasNextPage}
          isFetchingNextPage={mine.isFetchingNextPage}
          isFetchNextPageError={mine.isFetchNextPageError}
          fetchNextPage={() => void mine.fetchNextPage()}
          refetch={() => void mine.refetch()}
          empty={{
            icon: ClipboardList,
            title: t('mine.empty_requests_title'),
            description: t('mine.empty_requests_body'),
            action: { label: t('list.empty_cta'), onPress: () => newRequest() },
          }}
        />
      )}
    </Screen>
  );
}
