// Sheet đánh giá hai chiều sau khi yêu cầu hoàn thành: chủ chấm thợ được chọn, thợ chấm chủ yêu cầu. 5 sao (chữ mô tả điểm
// dưới sao, dùng chung group:rate.score_*) → nhận xét không bắt buộc (không SĐT) → "Gửi đánh giá" (tắt khi chưa chọn sao).
// Gửi: optimistic (useRateServiceRequest) → toast cảm ơn, đóng sheet; lỗi (already_rated, request_not_completed…) → toast.
import { SERVICE_REQUEST_RULES } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BottomSheet, Button, Input, StarRating, Text } from '@/ui';
import { useRequestRating } from '../hooks';

export type RateRequestSheetProps = {
  open: boolean;
  onClose: () => void;
  requestId: string;
  /** Người đang chấm: chủ yêu cầu → chấm thợ; thợ được chọn → chấm chủ. */
  as: 'customer' | 'pro';
  /** Tên người được chấm ("An N."). */
  name?: string | null;
};

export function RateRequestSheet({ open, onClose, requestId, as, name }: RateRequestSheetProps) {
  const { t } = useTranslation(['tho', 'group']);
  const rating = useRequestRating(requestId, open);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  const close = () => {
    setScore(0);
    setComment('');
    onClose();
  };
  const title = t(as === 'customer' ? 'tho:rate.title_customer' : 'tho:rate.title_pro');

  return (
    <BottomSheet open={open} onClose={close} title={title}>
      <Text tone="muted">{name ? `${name} — ${t('tho:rate.hint')}` : t('tho:rate.hint')}</Text>
      <View className="items-center gap-2">
        <StarRating
          value={score}
          onChange={setScore}
          accessibilityLabel={title}
          starLabel={(n) => `${t('group:rate.score_label', { count: n })}, ${t(`group:rate.score_${n}`)}`}
        />
        {/* Giữ chỗ một dòng để sheet không nhảy cao khi chọn sao lần đầu. */}
        <Text variant="label" accessibilityLiveRegion="polite" className="min-h-6">
          {score > 0 ? t(`group:rate.score_${score}`) : null}
        </Text>
      </View>
      <Input
        placeholder={t('tho:rate.comment_placeholder')}
        value={comment}
        onChangeText={setComment}
        maxLength={SERVICE_REQUEST_RULES.ratingCommentMax}
        multiline
        textAlignVertical="top"
        className="min-h-24"
      />
      <Button
        label={t('tho:rate.submit')}
        fullWidth
        disabled={score === 0}
        loading={rating.pending}
        onPress={() => rating.submit(score, comment, close)}
      />
    </BottomSheet>
  );
}
