// Sheet "Đã nhận lại đồ" / "Đã trả cho chủ" (đồ thất lạc, chủ tin) — ba bước trong cùng một BottomSheet:
// 1. Xác nhận (style Stitch "Popup xác minh nhận lại đồ"): nhãn "Bàn giao an toàn" (khiên) → thẻ nhỏ món đồ (ảnh bìa,
//    nhãn Mất đồ / Nhặt được, tiêu đề, nơi mất / nhặt) → (tin nhặt được) hộp nhắc hỏi đặc điểm riêng trước khi trao →
//    giải thích tin sẽ đóng → nút chính ghi rõ việc + Huỷ. Gọi RPC mark_listing_returned (useMarkListingReturned của
//    @hp/core: returned = true + đóng tin trong một lệnh).
// 2. Thành công (style Stitch "Popup Xác nhận bàn giao thành công"): dấu tích trong vòng success → nhãn "Bàn giao thành
//    công" → tiêu đề + câu theo loại tin → thẻ món đồ (nhãn "Đã trả lại") → "Gửi lời cảm ơn / Đánh giá" (khi có người đã
//    nhắn tin về tin) + "Nhắn tin" (hội thoại gần nhất) + "Để sau".
// 3. Đánh giá: ListingRateForm (chọn người → sao → lời khen nhanh → lời cảm ơn).
// Làm mới dữ liệu tin (deferRefresh) chỉ khi đóng sheet / mở chat: làm mới sớm khiến chi tiết tin gỡ sheet giữa chừng.
// Dùng ở chi tiết tin của mình và thẻ "Tin của tôi".
// Cố ý khác Stitch: không form khai tên / CCCD / ảnh đối chiếu / giờ đến nhận gửi "đội bảo vệ" (không có luồng / dữ liệu
// đó), không thẻ người nhận, điểm Karma, ảnh biên bản.
import type { PublicListing } from '@hp/core';
import { useListingCounterparts, useMarkListingReturned } from '@hp/core/react';
import { CircleCheck, MapPin, MessageCircle, PackageCheck, ShieldCheck, Star } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useOpenConversation } from '@/features/chat/hooks';
import { useErrorText } from '@/lib/errors';
import { attributeString } from '@/lib/listing';
import { Badge, BottomSheet, Button, Icon, ListingCover, Notice, Text, toast } from '@/ui';
import { ListingRateForm } from './ListingRateForm';

type ReturnedListing = Pick<PublicListing, 'id' | 'title' | 'category' | 'images' | 'attributes'>;
type Step = 'confirm' | 'done' | 'rate';

/** Chữ nút / tiêu đề theo loại tin: mất đồ → "Đã nhận lại đồ", nhặt được → "Đã trả cho chủ". */
export function returnedLabelKeys(category: PublicListing['category']) {
  return category === 'found'
    ? { action: 'lost_found.mark_returned_found', title: 'lost_found.mark_returned_found_confirm_title' }
    : { action: 'lost_found.mark_returned', title: 'lost_found.mark_returned_confirm_title' };
}

export function ReturnedSheet({ listing, open, onClose }: { listing: ReturnedListing; open: boolean; onClose: () => void }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const mark = useMarkListingReturned(listing.id, { deferRefresh: true });
  const [step, setStep] = useState<Step>('confirm');
  // Chỉ hỏi người đã chat sau khi trả xong (bước 2 cần biết có ai để cảm ơn / nhắn).
  const people = useListingCounterparts(listing.id, { enabled: open && step !== 'confirm' });
  const chat = useOpenConversation();
  const labels = returnedLabelKeys(listing.category);
  const found = listing.category === 'found';

  const close = () => {
    if (step !== 'confirm') mark.refresh();
    setStep('confirm');
    onClose();
  };
  const confirm = () =>
    mark.mutate(undefined, {
      onSuccess: () => setStep('done'),
      onError: (e) => toast.show(errorText(e.code), 'danger'),
    });
  const latest = people.data?.[0];
  const hasPeople = (people.data?.length ?? 0) > 0;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={step === 'confirm' ? t(labels.title) : step === 'rate' ? t('lost_found.rate.title') : undefined}
    >
      {step === 'confirm' ? (
        <>
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-md bg-primary-light">
              <Icon icon={ShieldCheck} tone="primary" size={20} />
            </View>
            <Text variant="label" weight="semibold" tone="primary">
              {t('lost_found.safe_flow')}
            </Text>
          </View>
          <ItemCard listing={listing} />
          {found ? <Notice icon={ShieldCheck} text={t('lost_found.returned_check')} /> : null}
          <Text tone="muted">{t('lost_found.mark_returned_confirm_body')}</Text>
          <Button label={t(labels.action)} icon={PackageCheck} fullWidth loading={mark.isPending} onPress={confirm} />
          <Button label={t('common:actions.cancel')} variant="ghost" fullWidth disabled={mark.isPending} onPress={close} />
        </>
      ) : step === 'done' ? (
        <>
          <View className="items-center gap-2 pt-2">
            <View className="size-16 items-center justify-center rounded-full bg-success/15">
              <Icon icon={CircleCheck} tone="success" size={40} />
            </View>
            <Badge label={t('lost_found.done_badge')} tone="success" numberOfLines={1} />
            <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite" className="text-center">
              {t('lost_found.done_title')}
            </Text>
            <Text tone="muted" className="text-center">
              {t(found ? 'lost_found.done_body_found' : 'lost_found.done_body_lost')}
            </Text>
          </View>
          <ItemCard listing={listing} returned />
          {hasPeople || people.isPending ? (
            <Button
              label={t('lost_found.done_rate')}
              icon={Star}
              fullWidth
              loading={people.isPending}
              onPress={() => setStep('rate')}
            />
          ) : null}
          {latest ? (
            <Button
              label={t('lost_found.done_message')}
              icon={MessageCircle}
              variant="outline"
              fullWidth
              onPress={() => {
                close();
                chat.openGroupChat(latest.conversationId);
              }}
            />
          ) : null}
          <Button label={t('lost_found.done_later')} variant="ghost" fullWidth onPress={close} />
        </>
      ) : (
        <ListingRateForm listingId={listing.id} onDone={close} />
      )}
    </BottomSheet>
  );
}

/** Thẻ nhỏ món đồ: ảnh bìa (nhãn "Đã trả lại" phủ đáy ảnh khi xong), Mất đồ / Nhặt được, tiêu đề, nơi mất / nhặt. */
function ItemCard({ listing, returned = false }: { listing: ReturnedListing; returned?: boolean }) {
  const { t } = useTranslation('listing');
  const found = listing.category === 'found';
  const place = attributeString(listing, 'place');
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <View className="size-14 overflow-hidden rounded-md border border-border">
        <ListingCover listing={listing} className="size-full" />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap gap-1">
          <Badge
            label={t(found ? 'lost_found.kind_found' : 'lost_found.kind_lost')}
            tone={found ? 'success' : 'danger'}
            numberOfLines={1}
          />
          {returned ? <Badge label={t('lost_found.returned_badge')} tone="primary" numberOfLines={1} /> : null}
        </View>
        <Text variant="label" weight="semibold" numberOfLines={2}>
          {listing.title}
        </Text>
        {place ? (
          <View className="flex-row items-center gap-1">
            <Icon icon={MapPin} tone="muted" size={16} />
            <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {place}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
