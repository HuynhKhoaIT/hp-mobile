// Một báo giá của thợ trong chi tiết yêu cầu (chủ yêu cầu xem danh sách để chọn; thợ xem báo giá của mình):
// avatar + tên "An N." + điểm uy tín (sao + số lượt, kèm chữ) → giá (đậm, primary) + nhãn "Giá tốt nhất" → có thể làm lúc →
// ghi chú → nhãn trạng thái → nút "Chọn thợ này" (chủ, yêu cầu còn mở, báo giá đang chờ) + "Nhắn tin".
// Không SĐT (chat lọc số, báo giá lọc số); không nút gọi điện.
import type { RequestQuote } from '@hp/core';
import { serviceQuoteDisplayStatus } from '@hp/shared';
import { MessageCircle, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatMoney } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Button, Card, Icon, Text } from '@/ui';
import { QuoteStatusBadge } from './RequestStatusBadge';

export type QuoteCardProps = {
  quote: RequestQuote;
  /** Giá thấp nhất trong các báo giá còn hiệu lực. */
  lowest?: boolean;
  /** Chủ yêu cầu, yêu cầu còn mở, báo giá đang chờ → hiện "Chọn thợ này". */
  onAccept?: () => void;
  accepting?: boolean;
  /** Mở chat với thợ này (chủ: trước hoặc sau khi chọn). */
  onChat?: () => void;
};

export function QuoteCard({ quote, lowest = false, onAccept, accepting = false, onChat }: QuoteCardProps) {
  const { t } = useTranslation('tho');
  const status = serviceQuoteDisplayStatus(quote.status);
  const name = quote.pro_name || '…';
  const rated = quote.pro_rating_count > 0;
  const rating = rated ? `${Number(quote.pro_rating_avg).toFixed(1)} (${quote.pro_rating_count})` : null;

  return (
    <Card className="gap-3" selected={status === 'accepted'}>
      <View className="flex-row items-center gap-3">
        <Avatar uri={profileAvatarUrl(quote.pro_avatar_url)} name={name} size="md" />
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          {rating ? (
            <View className="flex-row items-center gap-1" accessible accessibilityLabel={`${quote.pro_rating_avg}/5, ${quote.pro_rating_count}`}>
              <Icon icon={Star} tone="warning" size={14} filled />
              <Text variant="caption" tone="muted">
                {rating}
              </Text>
            </View>
          ) : null}
        </View>
        <QuoteStatusBadge status={status} />
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="heading" weight="bold" tone="primary">
          {formatMoney(quote.price)}
        </Text>
        {lowest ? <Badge label={t('detail.best_price')} tone="success" /> : null}
      </View>
      {quote.available_at ? (
        <Text variant="caption" tone="muted">
          {t('quote.available', { time: formatDate(quote.available_at, 'datetime') })}
        </Text>
      ) : null}
      {quote.note ? <Text selectable>{quote.note}</Text> : null}
      {onAccept || onChat ? (
        <View className="flex-row gap-2">
          {onAccept ? (
            <View className="flex-1">
              <Button label={t('quote.accept')} fullWidth loading={accepting} onPress={onAccept} />
            </View>
          ) : null}
          {onChat ? (
            <View className={onAccept ? undefined : 'flex-1'}>
              <Button
                label={t('actions.chat')}
                variant="outline"
                icon={MessageCircle}
                fullWidth={!onAccept}
                onPress={onChat}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
