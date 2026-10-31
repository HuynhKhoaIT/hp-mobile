// Màn kết quả sau khi đăng / sửa tin — theo `status` thật DB trả về (khớp web):
// active → "Đã đăng tin!" · pending_review → "Tin đang chờ duyệt" + lý do · rejected → "Tin chưa được đăng" + lý do.
// Hành động: Xem tin / Đăng tin khác / Tin của tôi (tin bị từ chối: Sửa tin).
import type { SavedListingResult } from '@hp/core';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Badge, SuccessScreen, Text } from '@/ui';
import { openEditListing, openListing, openMyListings } from '../navigation';

export function PostResult({ result, isEdit }: { result: SavedListingResult; isEdit: boolean }) {
  const { t, i18n } = useTranslation('listing');
  const postAnother = { label: t('form.post_another'), onPress: () => router.replace('/listing/new') };
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
        primary={{ label: t('form.my_listings'), onPress: () => openMyListings('pending', { replace: true }) }}
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
        primary={{ label: t('form.title_edit'), onPress: () => openEditListing(result.id, { replace: true }) }}
        secondary={[{ label: t('form.my_listings'), onPress: () => openMyListings('pending', { replace: true }) }]}
      >
        {reasonList}
      </SuccessScreen>
    );
  } else {
    body = (
      <SuccessScreen
        tone="success"
        title={isEdit ? t('form.saved') : t('form.success_title')}
        description={t('form.success_body')}
        primary={{ label: t('form.view_listing'), onPress: () => openListing(result.id, { replace: true }) }}
        secondary={[
          ...(isEdit ? [] : [postAnother]),
          { label: t('form.my_listings'), onPress: () => openMyListings('active', { replace: true }) },
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
