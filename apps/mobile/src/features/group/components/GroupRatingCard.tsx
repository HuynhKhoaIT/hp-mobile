// Khối đánh giá ở chi tiết nhóm — chỉ thành viên đã được nhận, sau khi nhóm diễn ra (canRateGroup). Chưa chấm: lời mời +
// nút "Đánh giá" (mở GroupRateSheet); đã chấm: sao + "Bạn đã chấm N/5". Đang đọc điểm → khung chờ cùng cỡ.
import type { PublicGroup } from '@hp/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Col, Row, Skeleton, StarRating, Text } from '@/ui';
import { useGroupRating } from '../hooks';
import { GroupRateSheet } from './GroupRateSheet';

export function GroupRatingCard({ group }: { group: PublicGroup }) {
  const { t } = useTranslation('group');
  const rating = useGroupRating(group.id);
  const [open, setOpen] = useState(false);

  if (rating.isLoading) return <Skeleton className="h-28 w-full rounded-md" />;

  if (rating.score !== null) {
    const label = t('rate.your_score', { score: rating.score });
    return (
      <Card>
        <Row gap={3}>
          <StarRating value={rating.score} size="sm" accessibilityLabel={label} />
          <Text variant="label" className="flex-1">
            {label}
          </Text>
        </Row>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Col gap={3}>
          <Col gap={1}>
            <Text variant="title">{t('rate.title')}</Text>
            <Text tone="muted">{t('rate.body', { title: group.title, name: group.host_name ?? '' })}</Text>
          </Col>
          <Button label={t('rate.cta')} variant="outline" fullWidth onPress={() => setOpen(true)} />
        </Col>
      </Card>
      <GroupRateSheet group={open ? group : null} onClose={() => setOpen(false)} />
    </>
  );
}
