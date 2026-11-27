// Chi tiết yêu cầu gọi thợ (`request/[id]`, push quote_* / request_*). Một bố cục, đổi theo vai trò người xem:
//   1 thẻ tóm tắt: loại thợ + trạng thái + mức khẩn → tiêu đề → ngân sách lớn màu primary → đăng / hết hạn → khu
//   2 banner đã huỷ / hết hạn / đã giao thợ → ảnh (carousel) → mô tả
//   3 "Địa chỉ làm việc": chính xác chỉ chủ + thợ được chọn (useRequestPrivate, RLS); người khác: dòng giải thích + khu gần đúng
//   4 chủ: "Báo giá (N)" — QuoteCard + "Chọn thợ này" (xác nhận) + "Nhắn tin"; thợ đã báo giá: "Báo giá của bạn"
//   5 người cần thợ (khi người xem không phải chủ) → mẹo làm việc an toàn
// Thanh dính đáy: RequestCtaBar. Chưa có bản đồ (chờ key Goong): chỉ chữ địa chỉ.
import type { AppError, PublicServiceRequest, RequestQuote } from '@hp/core';
import { useRequestPrivate, useRequestQuotes } from '@hp/core/react';
import { lowestQuoteId, serviceRequestDisplayStatus } from '@hp/shared';
import { Clock, MapPin, SearchX, Star } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { formatDate, formatRelative } from '@/lib/format';
import { profileAvatarUrl, requestImageUrl } from '@/lib/images';
import { Avatar, Badge, Card, ConfirmSheet, Divider, EmptyState, ErrorState, Icon, ImageGallery, Notice, SectionHeader, Skeleton, Text } from '@/ui';
import { useBudgetText, useRequestActions, useRequestViewer } from '../hooks';
import { backOrHome } from '../navigation';
import { TRADE_ICON } from '../trades';
import { QuoteCard } from './QuoteCard';
import { RequestCtaBar } from './RequestCtaBar';
import { RequestStatusBadge } from './RequestStatusBadge';

/** Phần cần của kết quả useServiceRequest. */
export type RequestQueryState = {
  data: PublicServiceRequest | undefined;
  isLoading: boolean;
  error: AppError | null;
  refetch: () => unknown;
};

/** Mã lỗi coi như "yêu cầu không còn" (id sai dạng → invalid_input). */
const NOT_FOUND = new Set(['not_found', 'invalid_input']);

/** Ba trạng thái của màn chi tiết + nội dung khi có dữ liệu (kể cả dữ liệu tạm từ cache danh sách). */
export function RequestDetailState({ query }: { query: RequestQueryState }) {
  const { t } = useTranslation('tho');
  if (query.data) return <RequestDetailBody request={query.data} />;
  if (query.isLoading) return <RequestDetailSkeleton />;
  if (!query.error || NOT_FOUND.has(query.error.code)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('list.empty_title')}
        description={t('detail.no_quotes_body')}
        action={{ label: t('list.title'), onPress: backOrHome }}
      />
    );
  }
  return <ErrorState code={query.error.code} onRetry={() => void query.refetch()} />;
}

export function RequestDetailSkeleton() {
  return (
    <View className="gap-4 pt-4">
      <View className="gap-3 rounded-lg border border-border bg-surface p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-8 w-1/2" />
      </View>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </View>
  );
}

function InfoRow({ icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2">
        <Icon icon={icon} tone="muted" />
        <Text tone="muted">{label}</Text>
      </View>
      <View className="flex-1 items-end">{children}</View>
    </View>
  );
}

function RequestDetailBody({ request }: { request: PublicServiceRequest }) {
  const { t } = useTranslation('tho');
  const budget = useBudgetText();
  const viewer = useRequestViewer(request);
  const actions = useRequestActions(request);
  const status = serviceRequestDisplayStatus(request);
  const isCustomer = viewer.role === 'customer';
  const hasOwnQuote = viewer.role === 'quoted' || viewer.role === 'accepted' || viewer.role === 'declined' || viewer.role === 'withdrawn';
  const quotes = useRequestQuotes(request.id, { enabled: isCustomer || hasOwnQuote });
  const privateInfo = useRequestPrivate(request.id, isCustomer || viewer.role === 'accepted');
  const [pick, setPick] = useState<RequestQuote | null>(null);

  const list = quotes.data ?? [];
  const best = lowestQuoteId(list);
  const accepted = list.find((q) => q.status === 'accepted');
  const open = status === 'open';
  const TradeIcon = TRADE_ICON[request.trade];
  const counterpart = isCustomer ? (accepted?.pro_name ?? null) : request.customer_name;

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-6" showsVerticalScrollIndicator={false}>
        <Card className="gap-3">
          <View className="flex-row flex-wrap gap-1">
            <Badge label={t(`trade.${request.trade}`)} tone="primary" />
            <RequestStatusBadge status={status} />
            <Badge label={t(`urgency.${request.urgency}`)} />
          </View>
          <View className="flex-row items-start gap-3">
            <View className="size-12 items-center justify-center rounded-md border border-service-goi-tho/20 bg-service-goi-tho-soft">
              <Icon icon={TradeIcon} service="goiTho" size="tab" />
            </View>
            <Text variant="heading" accessibilityRole="header" selectable className="flex-1">
              {request.title}
            </Text>
          </View>
          <Text variant="heading" weight="bold" tone="primary">
            {budget(request.budget_min, request.budget_max)}
          </Text>
          <Divider />
          <View className="flex-row items-start gap-2">
            <Icon icon={Clock} tone="muted" />
            <Text className="flex-1" tone="muted">
              {[
                t('detail.posted', { time: formatRelative(request.created_at) }),
                open ? t('detail.expires', { time: formatDate(request.expires_at, 'datetime') }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {request.site_name ? (
            <InfoRow icon={MapPin} label={t('form.site')}>
              <Text variant="label" className="text-right">
                {request.site_name}
              </Text>
            </InfoRow>
          ) : null}
        </Card>

        {status === 'cancelled' ? (
          <Notice tone="danger" text={t('status.cancelled')} />
        ) : status === 'expired' ? (
          <Notice text={t('status.expired')} />
        ) : status === 'assigned' && !isCustomer && viewer.role !== 'accepted' ? (
          <Notice text={t('status.assigned')} />
        ) : null}

        {request.images.length > 0 ? (
          <ImageGallery uris={request.images.map((p) => requestImageUrl(p, 'full'))} accessibilityLabel={request.title} thumbnails />
        ) : null}

        {request.description ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.section_info')} bar="primary" />
            <Text selectable>{request.description}</Text>
          </View>
        ) : null}

        <View className="gap-2">
          <SectionHeader title={t('detail.address_title')} bar="primary" />
          {privateInfo.data?.address_text ? (
            <Card className="gap-1">
              <View className="flex-row items-start gap-2">
                <Icon icon={MapPin} tone="primary" />
                <Text selectable className="flex-1">
                  {privateInfo.data.address_text}
                </Text>
              </View>
            </Card>
          ) : (
            <Notice
              text={isCustomer ? t('form.address_private') : t('detail.address_hidden')}
              title={request.site_name ? t('detail.address_area', { site: request.site_name }) : undefined}
            />
          )}
        </View>

        {isCustomer || hasOwnQuote ? (
          <View className="gap-3">
            <SectionHeader
              title={isCustomer ? t('detail.section_quotes', { count: list.length }) : t('detail.section_my_quote')}
              bar="accent"
            />
            {quotes.isLoading ? (
              <Skeleton className="h-28 w-full rounded-lg" />
            ) : quotes.isError ? (
              <ErrorState compact code={quotes.error.code} onRetry={() => void quotes.refetch()} />
            ) : list.length === 0 ? (
              <EmptyState compact icon={Star} title={t('detail.no_quotes_title')} description={t('detail.no_quotes_body')} />
            ) : (
              list.map((q) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  lowest={isCustomer && q.id === best && list.filter((x) => x.status === 'submitted').length > 1}
                  onAccept={isCustomer && open && q.status === 'submitted' ? () => setPick(q) : undefined}
                  accepting={actions.accepting}
                  onChat={isCustomer && (q.status === 'submitted' || q.status === 'accepted') ? () => actions.chat(q.pro_id) : undefined}
                />
              ))
            )}
          </View>
        ) : null}

        {!isCustomer ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.customer')} bar="primary" />
            <Card className="flex-row items-center gap-3">
              <Avatar uri={profileAvatarUrl(request.customer_avatar_url)} name={request.customer_name ?? '…'} size="md" />
              <View className="flex-1">
                <Text variant="label">{request.customer_name ?? '…'}</Text>
                {request.customer_rating_count > 0 ? (
                  <Text variant="caption" tone="muted">
                    {`${Number(request.customer_rating_avg).toFixed(1)} (${request.customer_rating_count})`}
                  </Text>
                ) : null}
              </View>
            </Card>
          </View>
        ) : null}

        <Notice variant="bordered" title={t('detail.safety_title')} text={t('detail.safety_body')} />
      </ScrollView>

      <RequestCtaBar request={request} role={viewer.role} loading={viewer.loading} myQuote={viewer.myQuote} counterpartName={counterpart} />

      <ConfirmSheet
        open={pick !== null}
        onClose={() => setPick(null)}
        title={t('quote.accept_title', { name: pick?.pro_name ?? '' })}
        body={t('quote.accept_body')}
        confirmLabel={t('quote.accept')}
        loading={actions.accepting}
        onConfirm={() => (pick ? actions.accept(pick.id, () => setPick(null)) : setPick(null))}
      />
    </>
  );
}
