// Chân màn đăng nhập (style Stitch "Đăng nhập gọn nhẹ"): link Điều khoản sử dụng · Chính sách bảo mật (mở trang web theo
// ngôn ngữ đang dùng) + dòng miễn trừ "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát". Việc đồng ý điều khoản vẫn là
// ô tích bắt buộc ở bước 2 onboarding — dòng này chỉ để đọc trước.
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { type WebPage, webPageUrl } from '@/lib/urls';
import { Col, Row, Text } from '@/ui';

const LINKS: { page: WebPage; key: 'terms' | 'privacy' }[] = [
  { page: '/dieu-khoan', key: 'terms' },
  { page: '/chinh-sach-bao-mat', key: 'privacy' },
];

export function AuthLegal() {
  const { t } = useTranslation();
  return (
    <Col gap={1} align="center" className="pt-2">
      <Row gap={2} justify="center" wrap>
        {LINKS.map((link, i) => (
          <Row key={link.page} gap={2}>
            {i > 0 ? (
              <Text variant="caption" tone="muted" accessibilityElementsHidden importantForAccessibility="no">
                ·
              </Text>
            ) : null}
            <Text
              variant="caption"
              tone="primary"
              accessibilityRole="link"
              suppressHighlighting
              className="min-h-11 py-3 underline"
              onPress={() => void WebBrowser.openBrowserAsync(webPageUrl(link.page))}
            >
              {t(`auth:onboarding.${link.key}`)}
            </Text>
          </Row>
        ))}
      </Row>
      <Text variant="micro" tone="muted" className="text-center">
        {t('disclaimer')}
      </Text>
    </Col>
  );
}
