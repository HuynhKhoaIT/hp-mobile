// Nút trên Header chi tiết yêu cầu: Chia sẻ (URL web tenapp.vn/goi-tho/yeu-cau/{id}) + Báo cáo (đích 'service_request';
// khách → đăng nhập). Chủ yêu cầu không thấy nút báo cáo (yêu cầu của chính mình).
import type { PublicServiceRequest } from '@hp/core';
import { serviceRequestUrl } from '@hp/core';
import { useSession } from '@hp/core/react';
import { APP_NAME } from '@hp/shared';
import { Flag, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform, Share } from 'react-native';
import { env } from '@/core/env';
import { useReportAction } from '@/core/report';
import { IconButton, ReportSheet } from '@/ui';

export function RequestHeaderActions({ request }: { request: Pick<PublicServiceRequest, 'id' | 'title' | 'customer_id'> }) {
  const { t } = useTranslation('tho');
  const { userId } = useSession();
  const report = useReportAction({ type: 'service_request', id: request.id });
  const isOwner = !!userId && userId === request.customer_id;

  const share = () => {
    const url = serviceRequestUrl(request.id, env.webUrl);
    // iOS: url riêng; Android: gộp vào message (Share.share không có trường url).
    void Share.share(Platform.OS === 'ios' ? { message: `${request.title} — ${APP_NAME}`, url } : { message: `${request.title} — ${APP_NAME}\n${url}` });
  };

  return (
    <>
      <IconButton icon={Share2} accessibilityLabel={t('common:actions.share')} onPress={share} />
      {isOwner ? null : (
        <>
          <IconButton icon={Flag} accessibilityLabel={t('report.request')} onPress={report.open} />
          <ReportSheet {...report.sheetProps} />
        </>
      )}
    </>
  );
}
