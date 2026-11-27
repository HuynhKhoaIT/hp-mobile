// Screen type: List
// Tab "Báo giá của tôi" (thợ): các báo giá mình đã gửi — giá, trạng thái báo giá (Chờ chủ chọn / Được chọn / Chưa được chọn /
// Đã rút) + trạng thái yêu cầu; bấm → chi tiết yêu cầu (sửa / rút / nhắn tin). Khách → mời đăng nhập; rỗng → "Xem yêu cầu".
import { useMyServiceQuotes, useSession } from '@hp/core/react';
import { MessageSquareQuote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MyQuoteCard } from '@/features/tho/components/MyQuoteCard';
import { RequestFeed } from '@/features/tho/components/RequestFeed';
import { ThoTabHeader } from '@/features/tho/components/ThoTabHeader';
import { openServiceRequest, openThoTab } from '@/features/tho/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Screen } from '@/ui';

export default function ThoQuotesScreen() {
  const { t } = useTranslation('tho');
  const session = useSession();
  const quotes = useMyServiceQuotes();

  return (
    <Screen tab statusBar="app">
      <ThoTabHeader title={t('tabs.quotes')} />
      {!session.isLoading && !session.userId ? (
        <SignInPrompt />
      ) : (
        <RequestFeed
          items={quotes.items}
          keyOf={(q) => q.quote_id}
          renderItem={(q) => <MyQuoteCard quote={q} onPress={() => openServiceRequest(q.request_id)} />}
          isLoading={session.isLoading || quotes.isLoading}
          isError={quotes.isError}
          errorCode={quotes.error?.code}
          isRefetching={quotes.isRefetching}
          hasNextPage={quotes.hasNextPage}
          isFetchingNextPage={quotes.isFetchingNextPage}
          isFetchNextPageError={quotes.isFetchNextPageError}
          fetchNextPage={() => void quotes.fetchNextPage()}
          refetch={() => void quotes.refetch()}
          empty={{
            icon: MessageSquareQuote,
            title: t('mine.empty_quotes_title'),
            description: t('mine.empty_quotes_body'),
            action: { label: t('mine.empty_quotes_cta'), onPress: () => openThoTab('index') },
          }}
        />
      )}
    </Screen>
  );
}
