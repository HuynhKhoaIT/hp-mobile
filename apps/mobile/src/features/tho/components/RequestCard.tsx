// Thẻ yêu cầu gọi thợ (danh sách "Việc quanh bạn", "Của tôi") — cùng ngôn ngữ card với GroupCard / ListingCard:
// (1) ô icon loại thợ (nền soft màu Gọi thợ) + tên loại + tiêu đề tối đa 2 dòng → (2) nhãn trạng thái + mức khẩn →
// (3) ngân sách (đậm, primary) | số báo giá → (4) khu · đăng cách đây bao lâu · còn hạn. Thẻ bấm được đọc thành một nút.
// Khớp web (apps/web/src/features/goi-tho/components/request-card.tsx): đổi một bên → đổi bên kia.
import type { PublicServiceRequest } from '@hp/core';
import { serviceRequestDisplayStatus } from '@hp/shared';
import { tradeArtKey } from '@hp/tokens/category-art';
import { MessageSquareQuote } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { Badge, Card, CategoryArt, Icon, Skeleton, Text } from '@/ui';
import { useBudgetText } from '../hooks';
import { RequestStatusBadge } from './RequestStatusBadge';

type CardRequest = Pick<
  PublicServiceRequest,
  'id' | 'trade' | 'title' | 'status' | 'expires_at' | 'budget_min' | 'budget_max' | 'quotes_count' | 'site_name' | 'created_at' | 'urgency'
>;

export type RequestCardProps = {
  request: CardRequest;
  onPress: () => void;
  /** Nhãn phụ cạnh trạng thái (Của tôi: "Báo giá của bạn: 450.000 ₫"). */
  extra?: ReactNode;
};

export function RequestCard({ request, onPress, extra }: RequestCardProps) {
  const { t } = useTranslation('tho');
  const budget = useBudgetText();
  const status = serviceRequestDisplayStatus(request);
  const trade = t(`trade.${request.trade}`);
  const quotes = request.quotes_count > 0 ? t('card.quotes_count', { count: request.quotes_count }) : t('card.no_quotes');
  const meta = [request.site_name, formatRelative(request.created_at)].filter(Boolean).join(' · ');

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[trade, request.title, t(`status.${status}`), budget(request.budget_min, request.budget_max), quotes, meta].join(', ')}
      className="gap-3"
    >
      <View className="flex-row items-start gap-3">
        <CategoryArt category={tradeArtKey(request.trade)} />
        <View className="flex-1 gap-0.5">
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {trade}
          </Text>
          <Text variant="title" numberOfLines={2}>
            {request.title}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center gap-1">
        <RequestStatusBadge status={status} />
        <Badge label={t(`urgency.${request.urgency}`)} />
        {extra}
      </View>
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="label" weight="bold" tone="primary" className="flex-1" numberOfLines={2}>
          {budget(request.budget_min, request.budget_max)}
        </Text>
        <View className="flex-row items-center gap-1">
          <Icon icon={MessageSquareQuote} tone="muted" size={16} />
          <Text variant="caption" tone="muted">
            {quotes}
          </Text>
        </View>
      </View>
      {meta ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </Card>
  );
}

/** Khung chờ đúng hình RequestCard. */
export function SkeletonRequestCard({ count = 1 }: { count?: number }) {
  return (
    <View className="gap-3 pt-3">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="gap-3 rounded-lg border border-border bg-surface p-4">
          <View className="flex-row gap-3">
            <Skeleton className="size-12 rounded-md" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-5 w-4/5" />
            </View>
          </View>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </View>
      ))}
    </View>
  );
}
