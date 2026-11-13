// Màn kết quả sau khi đăng / sửa tin — theo `status` thật DB trả về (khớp web):
// active → "Đã đăng tin!" · pending_review → "Tin đang chờ duyệt" + lý do · rejected → "Tin chưa được đăng" + lý do.
// Hành động: Xem tin / Đăng tin khác / Tin của tôi (tin bị từ chối: Sửa tin). Luồng của mini-app (`mini`): "Tin của tôi" về
// "Quản lý tin" của mini-app, "Đăng tin khác" giữ tính năng, "Sửa tin" / "Xem tin" mang `mini` — không rời mini-app.
// Mọi nút thay (replace) màn kết quả: luồng mini-app chỉ có một màn đăng trên mini-app (PostPicker mở form bằng replace)
// → Back từ tin vừa đăng / bộ chọn mới về thẳng mini-app, không chồng bộ chọn.
import type { SavedListingResult } from '@hp/core';
import type { ListingFeature } from '@hp/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Badge, SuccessScreen, Text } from '@/ui';
import { type MiniSlug, openEditListing, openListing, openMyListingsFrom, openPostPicker } from '../navigation';

export function PostResult({
  result,
  isEdit,
  feature,
  mini,
}: {
  result: SavedListingResult;
  isEdit: boolean;
  /** Tính năng của form — "Đăng tin khác" trong mini-app giữ tính năng này. */
  feature?: ListingFeature;
  mini?: MiniSlug;
}) {
  const { t, i18n } = useTranslation('listing');
  const postAnother = {
    label: t('form.post_another'),
    onPress: () => openPostPicker(mini ? feature : undefined, { mini, replace: true }),
  };
  const reasons = (result.moderation_reasons ?? []).filter((r) => i18n.exists(`listing:manage.reason.${r}`));
  const reasonList =
    reasons.length > 0 ? (
      <View className="items-center gap-2">
        {reasons.map((r) => (
          <Badge key={r} label={t(`manage.reason.${r}`)} tone={result.status === 'rejected' ? 'danger' : 'warning'} />
        ))}
      </View>
    ) : null;

  let body: ReactNode;
  if (result.status === 'pending_review') {
    body = (
      <SuccessScreen
        tone="warning"
        title={t('form.pending_title')}
        description={t('form.pending_body')}
        primary={{ label: t('form.my_listings'), onPress: () => openMyListingsFrom(mini, 'pending') }}
        secondary={isEdit ? [] : [postAnother]}
      >
        {reasonList}
      </SuccessScreen>
    );
  } else if (result.status === 'rejected') {
    body = (
      <SuccessScreen
        tone="danger"
        title={t('form.rejected_title')}
        description={t('form.rejected_body')}
        primary={{ label: t('form.title_edit'), onPress: () => openEditListing(result.id, { replace: true, mini }) }}
        secondary={[{ label: t('form.my_listings'), onPress: () => openMyListingsFrom(mini, 'pending') }]}
      >
        {reasonList}
      </SuccessScreen>
    );
  } else {
    body = (
      <SuccessScreen
        tone="success"
        celebrate={!isEdit}
        title={isEdit ? t('form.saved') : t('form.success_title')}
        description={t('form.success_body')}
        primary={{ label: t('form.view_listing'), onPress: () => openListing(result.id, { replace: true, mini }) }}
        secondary={[
          ...(isEdit ? [] : [postAnother]),
          { label: t('form.my_listings'), onPress: () => openMyListingsFrom(mini, 'active') },
        ]}
      />
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="grow">
      {body}
      <Text variant="caption" tone="muted" className="pb-4 text-center">
        {t('form.rules_hint')}
      </Text>
    </ScrollView>
  );
}
