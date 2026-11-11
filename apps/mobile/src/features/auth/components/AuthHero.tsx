// Khối mở đầu các màn đăng nhập (style Stitch "Nhập mã OTP", "Chọn nơi làm việc"): ô icon + tiêu đề + câu phụ.
// `center` (màn OTP): ô size-14 rounded-lg nền primary icon on-primary 28 + chấm accent có dấu tích ở góc, chữ căn giữa.
// `inline` (các bước onboarding): ô size-12 rounded-lg nền primary-light icon primary bên trái tiêu đề, câu phụ dưới.
// Ô icon chỉ trang trí (ẩn với trình đọc màn hình); tiêu đề là header.
import { Check, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Col, Icon, Row, Text } from '@/ui';

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

export function AuthHero({
  icon,
  title,
  subtitle,
  variant = 'inline',
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  variant?: 'center' | 'inline';
  /** Nội dung thêm dưới câu phụ (vd viên số điện thoại + Đổi số ở màn OTP). */
  children?: ReactNode;
}) {
  if (variant === 'center') {
    return (
      <Col gap={2} align="center">
        <View {...HIDDEN} className="mb-1 size-14 items-center justify-center rounded-lg bg-primary shadow-card">
          <Icon icon={icon} tone="onPrimary" size={28} />
          <View className="absolute -bottom-1 -right-1 size-5 items-center justify-center rounded-full border-2 border-surface bg-accent">
            <Icon icon={Check} tone="onAccent" size={12} strong />
          </View>
        </View>
        <Text variant="heading" weight="bold" tone="primary" accessibilityRole="header" className="text-center">
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" className="text-center">
            {subtitle}
          </Text>
        ) : null}
        {children}
      </Col>
    );
  }
  return (
    <Col gap={2}>
      <Row gap={3}>
        <View {...HIDDEN} className="size-12 items-center justify-center rounded-lg border border-primary/20 bg-primary-light">
          <Icon icon={icon} tone="primary" size="tab" />
        </View>
        <Text variant="heading" weight="bold" accessibilityRole="header" className="flex-1">
          {title}
        </Text>
      </Row>
      {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
      {children}
    </Col>
  );
}
