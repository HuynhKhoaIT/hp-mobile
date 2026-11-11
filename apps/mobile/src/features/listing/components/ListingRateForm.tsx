// Nội dung "Đánh giá & lời cảm ơn" sau khi trao trả đồ thất lạc (style Stitch "Đánh giá & Gửi lời cảm ơn người tìm thấy
// đồ"): chọn người (chủ tin: những người đã nhắn tin về tin — Avatar + "An N."; người khác: chủ tin, chọn sẵn) → câu hỏi +
// 5 sao (StarRating, chữ mức điểm dưới sao — không chỉ dựa vào màu) → chip lời khen nhanh (chỉ chèn chữ vào đầu lời cảm ơn,
// thuần UI) → lời cảm ơn ≤ 500 → "Gửi đánh giá". Gửi: useRateListing (@hp/core, optimistic) → toast cảm ơn → onDone; lỗi →
// toast errors.<code>. Đã chấm (một lần / tin) → dòng "Bạn đã đánh giá …". Loading skeleton · lỗi thử lại · rỗng (chưa ai
// nhắn tin) + nút đóng. Dùng trong ReturnedSheet (bước sau khi trả đồ) và ListingRateSheet (mở riêng).
// Cố ý bỏ khỏi Stitch: tặng cà phê, điểm Karma, bảng vinh danh (không có trong sản phẩm).
import { type ListingCounterpart, RATING_COMPLIMENTS, ratedCounterpart, toggleRatingPhrase } from '@hp/core';
import { useListingCounterparts, useRateListing } from '@hp/core/react';
import { LISTING_RATING_COMMENT_MAX } from '@hp/shared';
import { Check, Send } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Badge, Button, Chip, ErrorState, Icon, Input, Skeleton, StarRating, Text, toast } from '@/ui';

export function ListingRateForm({ listingId, onDone }: { listingId: string; onDone: () => void }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const people = useListingCounterparts(listingId);
  const rate = useRateListing(listingId);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');

  if (people.isPending) {
    return (
      <View className="gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mx-auto h-11 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </View>
    );
  }
  if (people.isError) {
    return <ErrorState compact code={people.error.code} onRetry={() => void people.refetch()} />;
  }

  const list = people.data;
  const rated = ratedCounterpart(list);
  if (rated) {
    return (
      <View className="gap-3">
        <View className="flex-row items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <Avatar uri={profileAvatarUrl(rated.avatarUrl)} name={rated.displayName || '?'} />
          <View className="flex-1 gap-1">
            <Text variant="label" weight="semibold">
              {t('lost_found.rate.rated', { name: rated.displayName, score: rated.myScore ?? 0 })}
            </Text>
            <StarRating value={rated.myScore ?? 0} size="sm" accessibilityLabel={t('group:rate.your_score', { score: rated.myScore ?? 0 })} />
          </View>
        </View>
        <Button label={t('common:actions.close')} variant="outline" fullWidth onPress={onDone} />
      </View>
    );
  }
  if (list.length === 0) {
    return (
      <View className="gap-3">
        <Text tone="muted">{t('lost_found.rate.empty')}</Text>
        <Button label={t('common:actions.close')} variant="outline" fullWidth onPress={onDone} />
      </View>
    );
  }

  // Một người (thường gặp, và luôn đúng với người không phải chủ tin) → chọn sẵn.
  const rateeId = picked ?? (list.length === 1 ? (list[0]?.userId ?? null) : null);
  const submit = () => {
    if (!rateeId) return toast.show(t('lost_found.rate.pick_required'), 'danger');
    if (!score) return toast.show(t('lost_found.rate.score_required'), 'danger');
    rate.mutate(
      { rateeId, score, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast.show(t('lost_found.rate.done'), 'success');
          onDone();
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      },
    );
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <View className="gap-0.5">
          <Text variant="label" weight="semibold">
            {t('lost_found.rate.pick_label')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('lost_found.rate.pick_hint')}
          </Text>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('lost_found.rate.pick_label')} className="gap-2">
          {list.map((c) => (
            <CounterpartOption key={c.userId} person={c} selected={c.userId === rateeId} onPress={() => setPicked(c.userId)} />
          ))}
        </View>
      </View>

      <View className="items-center gap-2 rounded-lg border border-border bg-surface p-4">
        <Text variant="label" weight="semibold" className="text-center">
          {t('lost_found.rate.question')}
        </Text>
        <Text variant="caption" tone="muted" className="text-center">
          {t('lost_found.rate.hint')}
        </Text>
        <StarRating
          value={score}
          onChange={setScore}
          disabled={rate.isPending}
          accessibilityLabel={t('lost_found.rate.question')}
          starLabel={(n) => `${t('group:rate.score_label', { count: n })}, ${t(`group:rate.score_${n}`)}`}
        />
        {/* Giữ chỗ một dòng để sheet không nhảy cao khi chọn sao lần đầu. */}
        <Text variant="label" accessibilityLiveRegion="polite" className="min-h-6">
          {score > 0 ? t(`group:rate.score_${score}`) : null}
        </Text>
      </View>

      <View className="gap-2">
        <Text variant="label" weight="semibold">
          {t('lost_found.rate.compliments_label')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {RATING_COMPLIMENTS.map((k) => {
            const phrase = t(`lost_found.rate.compliment_${k}`);
            return (
              <Chip
                key={k}
                size="sm"
                dot="accent"
                label={phrase}
                selected={comment.includes(phrase)}
                disabled={rate.isPending}
                onPress={() => setComment((c) => toggleRatingPhrase(c, phrase))}
              />
            );
          })}
        </View>
      </View>

      <Input
        label={t('lost_found.rate.comment_label')}
        placeholder={t('lost_found.rate.comment_placeholder')}
        value={comment}
        onChangeText={setComment}
        maxLength={LISTING_RATING_COMMENT_MAX}
        hint={`${comment.length}/${LISTING_RATING_COMMENT_MAX}`}
        editable={!rate.isPending}
        multiline
        textAlignVertical="top"
        className="min-h-24"
      />

      <Button
        label={t('lost_found.rate.submit')}
        icon={Send}
        fullWidth
        disabled={score === 0 || !rateeId}
        loading={rate.isPending}
        onPress={submit}
      />
    </View>
  );
}

function CounterpartOption({ person, selected, onPress }: { person: ListingCounterpart; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation('listing');
  const name = person.displayName || '?';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={person.isOwner ? `${name}, ${t('lost_found.rate.owner_tag')}` : name}
      onPress={onPress}
      className={[
        'min-h-14 flex-row items-center gap-3 rounded-lg border p-3 active:bg-surface-2',
        selected ? 'border-primary bg-primary-light' : 'border-border bg-surface',
      ].join(' ')}
    >
      <Avatar uri={profileAvatarUrl(person.avatarUrl)} name={name} size="sm" />
      <View className="flex-1 flex-row flex-wrap items-center gap-2">
        <Text variant="label" weight="semibold" numberOfLines={1} className="shrink">
          {name}
        </Text>
        {person.isOwner ? <Badge label={t('lost_found.rate.owner_tag')} tone="primary" numberOfLines={1} /> : null}
      </View>
      <View
        className={[
          'size-6 items-center justify-center rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-border bg-surface',
        ].join(' ')}
      >
        {selected ? <Icon icon={Check} tone="onPrimary" size={16} /> : null}
      </View>
    </Pressable>
  );
}
