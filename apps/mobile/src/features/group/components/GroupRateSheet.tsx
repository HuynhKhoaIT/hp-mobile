// Sheet đánh giá chủ nhóm (chi tiết nhóm, Nhóm của tôi → Đã qua): câu hỏi "Buổi … với … thế nào?" → 5 sao (chữ mô tả
// điểm dưới sao, không chỉ dựa vào màu) → nhận xét không bắt buộc → "Gửi đánh giá" (tắt khi chưa chọn sao).
// Gửi: optimistic (useRateGroup) → toast cảm ơn, đóng sheet; lỗi (group_not_finished, already_rated…) → toast.
import type { PublicGroup } from '@hp/core';
import { GROUP_RULES } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BottomSheet, Button, Input, StarRating, Text } from '@/ui';
import { useGroupRating } from '../hooks';

export type GroupRateSheetProps = {
  /** null → sheet đóng. */
  group: Pick<PublicGroup, 'id' | 'title' | 'host_name'> | null;
  onClose: () => void;
};

export function GroupRateSheet({ group, onClose }: GroupRateSheetProps) {
  const { t } = useTranslation('group');
  const rating = useGroupRating(group?.id ?? '', false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  const close = () => {
    setScore(0);
    setComment('');
    onClose();
  };

  return (
    <BottomSheet open={!!group} onClose={close} title={t('rate.title')}>
      {group ? (
        <Text tone="muted">{t('rate.body', { title: group.title, name: group.host_name ?? '' })}</Text>
      ) : null}
      <View className="items-center gap-2">
        <StarRating
          value={score}
          onChange={setScore}
          accessibilityLabel={t('rate.title')}
          starLabel={(n) => `${t('rate.score_label', { count: n })}, ${t(`rate.score_${n}`)}`}
        />
        {/* Giữ chỗ một dòng để sheet không nhảy cao khi chọn sao lần đầu. */}
        <Text variant="label" accessibilityLiveRegion="polite" className="min-h-6">
          {score > 0 ? t(`rate.score_${score}`) : null}
        </Text>
      </View>
      <Input
        label={t('rate.comment_label')}
        placeholder={t('rate.comment_placeholder')}
        value={comment}
        onChangeText={setComment}
        maxLength={GROUP_RULES.ratingCommentMax}
        multiline
        textAlignVertical="top"
        className="min-h-24"
      />
      <Button
        label={t('rate.submit')}
        fullWidth
        disabled={score === 0}
        loading={rating.isPending}
        onPress={() => rating.submit(score, comment, close)}
      />
    </BottomSheet>
  );
}
