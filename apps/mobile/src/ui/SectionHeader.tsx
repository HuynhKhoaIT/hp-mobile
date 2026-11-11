// SectionHeader — tiêu đề một khối nội dung (Hub, chi tiết tin) + một liên kết phụ bên phải (vd "Xem tất cả").
// Tiêu đề dải tin ở Hub (docs/design/home.md §10): hàng min-h-11; `icon` = ô size-8 rounded-md (nền màu dịch vụ nhạt
// + icon 20 màu dịch vụ, hoặc tone primary / accent); `subtitle` text-sm muted dưới tiêu đề; `chevron` thêm
// ChevronRight 20 sau chữ liên kết (text-md 500 primary). Vùng chạm liên kết ≥ 44.
// `size` 'md' (Hub, style Stitch): tiêu đề text-md 600 thay cho text-lg — khối gọn, tên khu dài ít xuống dòng.
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';

export type SectionHeaderIcon =
  | { service: ServiceKey; icon?: LucideIcon; tone?: undefined }
  | { icon: LucideIcon; tone: 'primary' | 'accent'; service?: undefined };

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: SectionHeaderIcon;
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
  /** ChevronRight sau chữ liên kết (dải tin ở Hub). */
  chevron?: boolean;
  /** Cỡ tiêu đề: 'lg' (mặc định, text-lg) · 'md' (text-md 600, các khối ở Hub). */
  size?: 'md' | 'lg';
  className?: string;
};

// Class đầy đủ để Tailwind quét được.
// accent (vàng) chỉ làm nền đặc + icon on-accent: icon vàng trên nền nhạt không đủ tương phản (giống web home-rails).
const TONE_BOX = { primary: 'bg-primary-light', accent: 'bg-accent' } as const;
const TONE_ICON = { primary: 'primary', accent: 'onAccent' } as const;

function HeaderIcon({ icon }: { icon: SectionHeaderIcon }) {
  if (icon.service !== undefined) {
    return (
      <View className={`size-8 items-center justify-center rounded-md ${SERVICE[icon.service].soft}`}>
        <Icon icon={icon.icon ?? SERVICE[icon.service].icon} service={icon.service} />
      </View>
    );
  }
  return (
    <View className={`size-8 items-center justify-center rounded-md ${TONE_BOX[icon.tone]}`}>
      <Icon icon={icon.icon} tone={TONE_ICON[icon.tone]} />
    </View>
  );
}

export function SectionHeader({ title, subtitle, icon, action, chevron = false, size = 'lg', className }: SectionHeaderProps) {
  return (
    <View className={['min-h-11 flex-row items-center gap-3', className].filter(Boolean).join(' ')}>
      {icon ? <HeaderIcon icon={icon} /> : null}
      <View className="flex-1">
        <Text variant={size === 'md' ? 'label' : 'title'} weight="semibold" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          hitSlop={8}
          className="min-h-11 flex-row items-center gap-0.5 active:opacity-70"
        >
          <Text variant="label" tone="primary">
            {action.label}
          </Text>
          {chevron ? <Icon icon={ChevronRight} tone="primary" /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}
