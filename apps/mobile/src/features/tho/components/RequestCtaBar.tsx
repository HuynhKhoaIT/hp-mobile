// Thanh dính đáy chi tiết yêu cầu theo vai trò người xem (serviceRequestViewerRole) và trạng thái (serviceRequestDisplayStatus),
// hành động lấy từ serviceRequestActions (@hp/shared — app + web cùng luật):
//   khách: "Đăng nhập để báo giá" · chưa báo giá / đã rút: "Báo giá" (sheet giá + ghi chú) ·
//   đã báo giá: "Sửa báo giá" + "Nhắn tin" | "Rút báo giá" · thợ được chọn: "Nhắn tin" (+ "Đánh giá" khi xong) ·
//   chủ: yêu cầu mở + chưa báo giá: "Sửa yêu cầu" | "Huỷ" · đã chọn thợ: "Đã làm xong" + "Nhắn tin" | "Huỷ yêu cầu" ·
//   hoàn thành: "Đánh giá thợ" (một lần). Chủ chọn thợ ở danh sách báo giá (QuoteCard), không ở thanh này.
// Hành động khó hoàn tác (rút, huỷ, xác nhận xong) xác nhận bằng ConfirmSheet. Không có nút gọi điện.
import type { MyQuoteForRequest, PublicServiceRequest } from '@hp/core';
import {
  type ServiceRequestAction,
  serviceRequestActions,
  serviceRequestDisplayStatus,
  type ServiceRequestViewerRole,
} from '@hp/shared';
import { CircleCheck, MessageCircle, Star } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { Button, ConfirmSheet, StickyCta } from '@/ui';
import { useRequestActions, useRequestRating } from '../hooks';
import { openEditRequest } from '../navigation';
import { QuoteSheet } from './QuoteSheet';
import { RateRequestSheet } from './RateRequestSheet';

type Sheet = 'quote' | 'withdraw' | 'cancel' | 'complete' | 'rate' | null;

export type RequestCtaBarProps = {
  request: PublicServiceRequest;
  role: ServiceRequestViewerRole;
  loading: boolean;
  myQuote: MyQuoteForRequest | null;
  /** Tên người còn lại ("An N.") để ghi vào sheet đánh giá. */
  counterpartName?: string | null;
};

export function RequestCtaBar({ request, role, loading, myQuote, counterpartName }: RequestCtaBarProps) {
  const { t } = useTranslation('tho');
  const actions = useRequestActions(request);
  const status = serviceRequestDisplayStatus(request);
  const canRate = (role === 'customer' || role === 'accepted') && status === 'completed';
  const rating = useRequestRating(request.id, canRate);
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);

  const list = serviceRequestActions(role, status, { quotesCount: request.quotes_count, rated: rating.rated !== null });
  const has = (a: ServiceRequestAction) => list.includes(a);
  const chat = () => actions.chat(role === 'customer' ? (request.accepted_pro_id ?? undefined) : undefined);

  let body: ReactNode = null;
  if (loading) {
    body = <Button label={t('actions.quote')} fullWidth loading disabled />;
  } else if (has('login')) {
    body = <Button label={t('actions.login')} fullWidth onPress={() => requireAuth()} />;
  } else if (role === 'customer') {
    if (has('complete')) {
      body = (
        <>
          <Button label={t('actions.complete')} icon={CircleCheck} fullWidth loading={actions.completing} onPress={() => setSheet('complete')} />
          <View className="flex-row gap-2">
            <View className="flex-1">{has('chat') ? <Button label={t('actions.chat')} variant="outline" icon={MessageCircle} fullWidth loading={actions.openingChat} onPress={chat} /> : null}</View>
            <View className="flex-1">
              <Button label={t('actions.cancel')} variant="ghost" fullWidth onPress={() => setSheet('cancel')} />
            </View>
          </View>
        </>
      );
    } else if (has('rate')) {
      body = <Button label={t('actions.rate')} icon={Star} fullWidth onPress={() => setSheet('rate')} />;
    } else if (has('cancel')) {
      body = (
        <View className="flex-row gap-2">
          {has('edit') ? (
            <View className="flex-1">
              <Button label={t('actions.edit')} fullWidth onPress={() => openEditRequest(request.id)} />
            </View>
          ) : null}
          <View className="flex-1">
            <Button label={t('actions.cancel')} variant={has('edit') ? 'outline' : 'secondary'} fullWidth onPress={() => setSheet('cancel')} />
          </View>
        </View>
      );
    }
  } else if (has('quote')) {
    body = <Button label={t('actions.quote')} fullWidth onPress={() => requireAuth(() => setSheet('quote'))} />;
  } else if (has('edit_quote')) {
    body = (
      <>
        <Button label={t('actions.edit_quote')} fullWidth onPress={() => setSheet('quote')} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label={t('actions.chat')} variant="outline" icon={MessageCircle} fullWidth loading={actions.openingChat} onPress={chat} />
          </View>
          <View className="flex-1">
            <Button label={t('actions.withdraw_quote')} variant="ghost" fullWidth onPress={() => setSheet('withdraw')} />
          </View>
        </View>
      </>
    );
  } else if (role === 'accepted') {
    body = (
      <>
        {has('chat') ? <Button label={t('actions.chat')} icon={MessageCircle} fullWidth loading={actions.openingChat} onPress={chat} /> : null}
        {has('rate') ? <Button label={t('actions.rate')} variant="outline" icon={Star} fullWidth onPress={() => setSheet('rate')} /> : null}
      </>
    );
  }

  return (
    <>
      {body ? <StickyCta elevated>{body}</StickyCta> : null}

      <QuoteSheet
        open={sheet === 'quote'}
        onClose={close}
        requestId={request.id}
        existing={myQuote}
        pending={actions.sending}
        onSubmit={(vars, edited) => actions.sendQuote(vars, edited, close)}
      />
      <ConfirmSheet
        open={sheet === 'withdraw'}
        onClose={close}
        title={t('quote.withdraw_title')}
        body={t('quote.withdraw_body')}
        confirmLabel={t('quote.withdraw')}
        confirmVariant="danger"
        loading={actions.withdrawing}
        onConfirm={() => (myQuote ? actions.withdraw(myQuote.id, close) : close())}
      />
      <ConfirmSheet
        open={sheet === 'cancel'}
        onClose={close}
        title={t('actions.cancel_title')}
        body={t('actions.cancel_body')}
        confirmLabel={t('actions.cancel')}
        confirmVariant="danger"
        loading={actions.cancelling}
        onConfirm={() => actions.cancel(close)}
      />
      <ConfirmSheet
        open={sheet === 'complete'}
        onClose={close}
        title={t('actions.complete_title')}
        body={t('actions.complete_body')}
        confirmLabel={t('actions.complete')}
        loading={actions.completing}
        onConfirm={() => actions.complete(close)}
      />
      <RateRequestSheet
        open={sheet === 'rate'}
        onClose={close}
        requestId={request.id}
        as={role === 'customer' ? 'customer' : 'pro'}
        name={counterpartName}
      />
    </>
  );
}
