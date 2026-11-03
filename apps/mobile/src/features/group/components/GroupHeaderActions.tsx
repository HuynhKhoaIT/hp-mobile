// Nút trên Header chi tiết nhóm: Chia sẻ (URL web tenapp.vn/nhom/{slug}) + Báo cáo (đích 'group'; khách → đăng nhập).
// Chủ nhóm không thấy nút báo cáo (nhóm của chính mình).
import type { PublicGroup } from '@hp/core';
import { useSession } from '@hp/core/react';
import { Flag, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useReportAction } from '@/core/report';
import { IconButton, ReportSheet } from '@/ui';
import { useShareGroup } from '../hooks';

export function GroupHeaderActions({ group }: { group: PublicGroup }) {
  const { t } = useTranslation('group');
  const { userId } = useSession();
  const share = useShareGroup();
  const report = useReportAction({ type: 'group', id: group.id });
  const isHost = !!userId && userId === group.host_id;
  return (
    <>
      {group.slug ? <IconButton icon={Share2} accessibilityLabel={t('common:actions.share')} onPress={() => share(group)} /> : null}
      {isHost ? null : (
        <>
          <IconButton icon={Flag} accessibilityLabel={t('detail.report')} onPress={report.open} />
          <ReportSheet {...report.sheetProps} />
        </>
      )}
    </>
  );
}
