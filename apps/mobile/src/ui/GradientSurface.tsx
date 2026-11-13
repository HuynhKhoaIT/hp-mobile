// GradientSurface — nền gradient của mini-app (header, banner mời đăng tin), style Stitch "Nhà Trọ Dung Quất" / "Chợ Pass":
// màu from → to lấy từ useTheme().appGradient (appThemes của mini-app đang bao quanh — AppThemeProvider; ngoài mini-app là
// gradient thương hiệu). Vẽ bằng style `backgroundImage: linear-gradient(...)` của React Native (kiến trúc mới, không thêm
// thư viện), nền đặc bg-app-from làm dự phòng. Bên trong là OnGradientScope: text-on-primary / Icon tone="onPrimary" / nút
// glass = trắng ở cả giao diện sáng và tối (gradient đậm ở cả hai).
// `direction`: 'horizontal' (header — trái sang phải, như Stitch `bg-gradient-to-r`) · 'diagonal' (banner — góc trên trái
// xuống góc dưới phải, `bg-gradient-to-br`).
import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { OnGradientScope, useTheme } from './theme';

export type GradientSurfaceProps = {
  children?: ReactNode;
  direction?: 'horizontal' | 'diagonal';
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const ANGLE = { horizontal: '90deg', diagonal: '135deg' } as const;

export function GradientSurface({ children, direction = 'horizontal', className, style }: GradientSurfaceProps) {
  const { appGradient } = useTheme();
  const [from, to] = appGradient;
  return (
    <OnGradientScope
      className={['bg-app-from', className].filter(Boolean).join(' ')}
      style={[{ backgroundImage: `linear-gradient(${ANGLE[direction]}, ${from}, ${to})` }, style]}
    >
      {children}
    </OnGradientScope>
  );
}
