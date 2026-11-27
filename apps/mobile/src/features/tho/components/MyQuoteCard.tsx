// Thẻ "Báo giá của tôi" (thợ): loại thợ + tiêu đề yêu cầu → nhãn trạng thái yêu cầu + trạng thái báo giá của mình → giá mình
// báo (đậm, primary) → người cần thợ · khu. Bấm → chi tiết yêu cầu. my_service_quotes không có hạn → trạng thái yêu cầu theo DB.
import type { MyServiceQuote } from '@hp/core';
import { serviceQuoteDisplayStatus } from '@hp/shared';
import { tradeArtKey } from '@hp/tokens/category-art';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatMoney, formatRelative } from '@/lib/format';
import { Card, CategoryArt, Text } from '@/ui';
import { QuoteStatusBadge, RequestStatusBadge } from './RequestStatusBadge';

export function MyQuoteCard({ quote, onPress }: { quote: MyServiceQuote; onPress: () => void }) {
  const { t } = useTranslation('tho');
  const quoteStatus = serviceQuoteDisplayStatus(quote.quote_status);
  const meta = [quote.customer_name, quote.site_name, formatRelative(quote.quoted_at)].filter(Boolean).join(' · ');

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[t(`trade.${quote.trade}`), quote.title, t(`status.${quote.request_status}`), t(`quote_status.${quoteStatus}`), formatMoney(quote.price), meta].join(', ')}
      className="gap-3"
    >
      <View className="flex-row items-start gap-3">
        <CategoryArt category={tradeArtKey(quote.trade)} />
        <View className="flex-1 gap-0.5">
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t(`trade.${quote.trade}`)}
          </Text>
          <Text variant="title" numberOfLines={2}>
            {quote.title}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center gap-1">
        <QuoteStatusBadge status={quoteStatus} />
        <RequestStatusBadge status={quote.request_status} />
      </View>
      <Text variant="heading" weight="bold" tone="primary">
        {formatMoney(quote.price)}
      </Text>
      {meta ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </Card>
  );
}
