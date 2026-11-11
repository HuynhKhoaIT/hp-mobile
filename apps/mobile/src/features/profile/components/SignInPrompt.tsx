// Khối mời đăng nhập dùng chung (style Stitch "Khối mời đăng nhập dùng chung (SignInPrompt)"), khớp SignInPrompt của web
// (apps/web/src/components/shared/sign-in-prompt.tsx): khách mở màn cần tài khoản (Tôi, Tin nhắn, Tin của tôi, Tin đã lưu,
// Huy hiệu, Nhóm của tôi, Cài đặt thông báo, Đăng tin / Tạo nhóm…). Một thẻ: ô khoá nền primary + chấm cam → "Đăng nhập để
// tiếp tục" + dòng phụ primary (một tài khoản cho app và web) → mô tả (mặc định auth.dialog.description, nơi gọi truyền lời
// theo ngữ cảnh) → hộp 3 lợi ích có thật (nhắn tin, đăng tin / ghép nhóm miễn phí, huy hiệu xác minh) → nút cam "Tiếp tục
// bằng số điện thoại" (requireAuth → màn số điện thoại, xong quay lại đúng màn) → hộp cam kết riêng tư. Tự cuộn (màn hẹp,
// font 150%) — đặt thẳng trong Screen không scroll, chiếm phần còn lại của màn.
// Khác Stitch (cố ý): khối nằm trong màn, không phải bottom sheet có nút đóng / nền mờ (màn cần tài khoản không có gì khác
// để xem); không ô nhập số + mã vùng +84 tại chỗ và không "Xác thực OTP 30s" (màn số điện thoại của luồng đăng nhập đã
// có, kèm Google — giữ một luồng và quay lại đúng chỗ); không nút Zalo (không có đăng nhập Zalo); không gradient / chấm nháy
// trên ô khoá (chấm tĩnh — không animation lặp); lợi ích "Tích xanh công nhân Hòa Phát, Doosan, PTSC", "Liên hệ qua Zalo",
// "OTP 30s" không có thật → 3 lợi ích đúng; không link Điều khoản / Quy chế trong hộp riêng tư (màn số điện thoại đã có
// link pháp lý); không header / bottom nav / footer riêng (màn gọi đã có).
import { BadgeCheck, LockKeyhole, MessageCircle, MessageSquareText, SquarePen, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { Button, Card, Icon, Row, SERVICE, type ServiceKey, Text } from '@/ui';

type Benefit = { key: 'chat' | 'post' | 'badge'; icon: LucideIcon; box: ServiceKey | 'primary' };

const BENEFITS: readonly Benefit[] = [
  { key: 'chat', icon: MessageCircle, box: 'primary' },
  { key: 'post', icon: SquarePen, box: 'pass' },
  { key: 'badge', icon: BadgeCheck, box: 'lostFound' },
];

function BenefitIcon({ icon, box }: Pick<Benefit, 'icon' | 'box'>) {
  if (box === 'primary') {
    return (
      <View className="size-8 items-center justify-center rounded-md bg-primary-light">
        <Icon icon={icon} tone="primary" size={18} />
      </View>
    );
  }
  return (
    <View className={`size-8 items-center justify-center rounded-md ${SERVICE[box].soft}`}>
      <Icon icon={icon} service={box} size={18} />
    </View>
  );
}

export function SignInPrompt({ description }: { description?: string }) {
  const { t } = useTranslation('auth');
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-4" showsVerticalScrollIndicator={false}>
      <Card className="gap-4">
        <Row gap={3}>
          <View>
            <View className="size-12 items-center justify-center rounded-lg bg-primary shadow-card">
              <Icon icon={LockKeyhole} tone="onPrimary" size="tab" />
            </View>
            <View className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-surface bg-accent" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text variant="titleLg" weight="bold" accessibilityRole="header">
              {t('dialog.title')}
            </Text>
            <Text variant="caption" weight="semibold" tone="primary">
              {t('prompt.kicker')}
            </Text>
          </View>
        </Row>

        <Text tone="muted">{description ?? t('dialog.description')}</Text>

        <View className="gap-3 rounded-lg border border-border bg-surface-2 p-3">
          {BENEFITS.map((b) => (
            <Row key={b.key} gap={3} align="start">
              <BenefitIcon icon={b.icon} box={b.box} />
              <View className="flex-1">
                <Text variant="label" weight="semibold">
                  {t(`prompt.benefit_${b.key}`)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(`prompt.benefit_${b.key}_hint`)}
                </Text>
              </View>
            </Row>
          ))}
        </View>

        <Button label={t('prompt.cta')} icon={MessageSquareText} variant="accent" fullWidth onPress={() => requireAuth()} />

        <Row gap={2} align="start" className="rounded-md bg-primary-light p-3">
          <Icon icon={ShieldCheck} tone="primary" size={18} />
          <Text variant="caption" className="flex-1">
            {t('prompt.privacy')}
          </Text>
        </Row>
      </Card>
    </ScrollView>
  );
}
