// Một huy hiệu xác minh ở màn Huy hiệu: icon + tên (listing.owner_badge.*) + nhãn trạng thái (luôn có chữ, không chỉ
// màu) → giấy tờ cần có → lý do khi bị từ chối → nút "Xin huy hiệu" / "Gửi lại". Bấm → mở khung gửi ngay trong thẻ:
// ảnh giấy tờ (ImagePicker 1 ảnh, chọn từ thư viện) hoặc "Chụp ảnh" → "Gửi xác minh" (nén + useRequestBadge).
// Không dùng sheet: khung mở tại chỗ để người dùng vẫn thấy hướng dẫn giấy tờ khi chụp.
import { Camera, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { PickedImage } from '@/core/upload';
import { Badge, type BadgeTone, Button, Card, Col, Icon, ImagePicker, Row, Skeleton, Text, type TextTone } from '@/ui';
import { type BadgeState, type BadgeStatus, usePickDocument, useSubmitBadgeRequest } from '../hooks';

const STATUS: Record<Exclude<BadgeStatus, 'none'>, { key: string; tone: BadgeTone; icon: TextTone }> = {
  owned: { key: 'badge_request.owned', tone: 'success', icon: 'success' },
  pending: { key: 'badge_request.status_pending', tone: 'warning', icon: 'warning' },
  rejected: { key: 'badge_request.status_rejected', tone: 'danger', icon: 'danger' },
};

export type BadgeRequestCardProps = {
  state: BadgeState;
  /** Khung gửi đang mở ở thẻ này (một thẻ một lúc). */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function BadgeRequestCard({ state, open, onOpen, onClose }: BadgeRequestCardProps) {
  const { t } = useTranslation();
  const [image, setImage] = useState<PickedImage | null>(null);
  const submit = useSubmitBadgeRequest();
  const pick = usePickDocument(setImage);
  const name = t(`listing:owner_badge.${state.badge}`);
  const status = state.status === 'none' ? null : STATUS[state.status];
  const canRequest = state.status === 'none' || state.status === 'rejected';

  const close = () => {
    setImage(null);
    onClose();
  };

  return (
    <Card>
      <Col gap={3}>
        <Row gap={3} align="start">
          <View className="size-10 items-center justify-center rounded-full bg-surface-2">
            <Icon icon={ShieldCheck} tone={status?.icon ?? 'muted'} />
          </View>
          <Col gap={1} className="flex-1">
            <Text variant="label" weight="semibold">
              {name}
            </Text>
            {status ? (
              <View className="flex-row">
                <Badge label={t(status.key)} tone={status.tone} />
              </View>
            ) : null}
          </Col>
        </Row>
        <Text tone="muted">{t(`badge_request.doc_hint_${state.badge}`)}</Text>
        {state.status === 'rejected' && state.reason ? (
          <Text tone="danger">{t('badge_request.reason', { reason: state.reason })}</Text>
        ) : null}

        {canRequest && !open ? (
          <Button
            label={t(state.status === 'rejected' ? 'badge_request.request_again' : 'badge_request.request')}
            variant="outline"
            fullWidth
            onPress={onOpen}
          />
        ) : null}

        {canRequest && open ? (
          <Col gap={3}>
            <ImagePicker
              items={image ? [{ key: image.uri, uri: image.uri, status: 'idle' }] : []}
              max={1}
              cover={false}
              addLabel={t('badge_request.from_library')}
              onAdd={() => void pick.library()}
              onRemove={() => setImage(null)}
              disabled={submit.isPending}
            />
            <Button
              label={t(image ? 'badge_request.change_photo' : 'badge_request.take_photo')}
              icon={Camera}
              variant="outline"
              fullWidth
              disabled={submit.isPending}
              onPress={() => void pick.camera()}
            />
            <Button
              label={t('badge_request.submit')}
              fullWidth
              disabled={!image}
              loading={submit.isPending}
              onPress={() => image && submit.submit(state.badge, image, close)}
            />
            <Button label={t('actions.cancel')} variant="ghost" fullWidth disabled={submit.isPending} onPress={close} />
          </Col>
        ) : null}
      </Col>
    </Card>
  );
}

export function BadgeRequestCardSkeleton() {
  return (
    <Card>
      <Col gap={3}>
        <Row gap={3}>
          <Skeleton className="size-10 rounded-full" />
          <Col gap={2} className="flex-1">
            <Skeleton className="h-4 w-1/2 rounded-sm" />
            <Skeleton className="h-4 w-1/4 rounded-sm" />
          </Col>
        </Row>
        <Skeleton className="h-4 w-full rounded-sm" />
      </Col>
    </Card>
  );
}
