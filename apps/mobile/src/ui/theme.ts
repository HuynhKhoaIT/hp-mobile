// useTheme(): giá trị token cho nơi không nhận className (Reanimated, icon Lucide, thư viện ngoài).
// Màu đọc theo giao diện đang dùng (sáng / tối). Không khai báo token ở đây — mọi giá trị từ @hp/tokens.
//
// Màu riêng của mini-app (appThemes của @hp/tokens — Chợ Pass cam đất, Nhà trọ emerald…): <AppThemeProvider theme="room">
// bọc khung mini-app (và màn mở chồng từ mini-app: chi tiết tin, chat, đăng / sửa tin có ?mini=) → (1) ghi đè biến CSS
// --color-primary / -primary-light / -on-primary / -app-from / -app-to bằng vars() của NativeWind nên mọi bg-primary /
// text-primary / bg-app-from bên trong tự đổi màu; (2) useTheme() bên trong trả primary / primaryLight / onPrimary + `appGradient`
// của mini-app cho chỗ cần giá trị JS (icon Lucide, Reanimated, RefreshControl, gradient). Ngoài mini-app không đổi gì
// (appGradient = gradient thương hiệu). Nội dung vẽ qua portal (BottomSheet của @gorhom) nằm ngoài cây → BottomSheet tự bọc lại
// bằng useAppThemeKey() + AppThemeProvider.
// <OnGradientScope> (dùng trong GradientSurface): vùng chữ / icon trên nền gradient đậm (header mini-app, banner) — on-primary
// luôn trắng (onAccent) kể cả giao diện tối (onPrimary tối của dark chỉ hợp với primary sáng, không hợp gradient đậm).
import {
  type AppThemeKey,
  appThemes,
  appThemeVars,
  colors,
  font,
  gradients,
  hitTarget,
  icon,
  motion,
  radius,
  rgbChannels,
  serviceColors,
  shadow,
  shimmer,
  space,
} from '@hp/tokens';
import { useColorScheme, vars } from 'nativewind';
import { createContext, createElement, Fragment, type ReactNode, useContext, useMemo } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { Easing, type EasingFunction, useReducedMotion } from 'react-native-reanimated';

export type Scheme = 'light' | 'dark';
export type { AppThemeKey };

export function useScheme(): Scheme {
  return useColorScheme().colorScheme === 'dark' ? 'dark' : 'light';
}

type ThemeScope = { app: AppThemeKey | null; onGradient: boolean };

const ThemeScopeContext = createContext<ThemeScope>({ app: null, onGradient: false });

/** Mini-app đang bao quanh (null = super app). */
export function useAppThemeKey(): AppThemeKey | null {
  return useContext(ThemeScopeContext).app;
}

export function useTheme() {
  const scheme = useScheme();
  const scope = useContext(ThemeScopeContext);
  return useMemo(() => {
    const base = colors[scheme];
    const app = scope.app ? appThemes[scheme][scope.app] : null;
    const themed: Record<keyof typeof base, string> = {
      ...base,
      ...(app ? { primary: app.primary, primaryLight: app.primaryLight, onPrimary: app.onPrimary } : {}),
      ...(scope.onGradient ? { onPrimary: base.onAccent } : {}),
    };
    return {
      scheme,
      colors: themed,
      serviceColors: serviceColors[scheme],
      gradients,
      /** Gradient header của mini-app đang bao quanh [from, to]; ngoài mini-app = gradient thương hiệu. */
      appGradient: (app ? app.gradient : gradients.brand) as readonly [string, string],
      space,
      radius,
      font,
      shadow,
      /** Màu giữa của dải sáng skeleton (rgba, theo sáng / tối). */
      shimmer: shimmer[scheme],
      motion,
      hitTarget,
      icon,
    };
  }, [scheme, scope.app, scope.onGradient]);
}

export type Theme = ReturnType<typeof useTheme>;

export type AppThemeProviderProps = {
  /** Mini-app (khoá appThemes); null / undefined → không bọc gì (giữ màu super app). */
  theme?: AppThemeKey | null;
  children?: ReactNode;
  /** Class của View bọc (mặc định flex-1 — khung màn hình); có → luôn có View kể cả khi không có mini-app. */
  className?: string;
};

/** Bọc khung mini-app: biến màu NativeWind + giá trị useTheme() theo appThemes[scheme][theme]. */
export function AppThemeProvider({ theme, children, className }: AppThemeProviderProps) {
  const scheme = useScheme();
  const parent = useContext(ThemeScopeContext);
  const style = useMemo(() => (theme ? vars(appThemeVars(scheme, theme)) : undefined), [scheme, theme]);
  const value = useMemo(() => ({ ...parent, app: theme ?? parent.app }), [parent, theme]);
  if (!theme) return className ? createElement(View, { className }, children) : createElement(Fragment, null, children);
  return createElement(
    ThemeScopeContext.Provider,
    { value },
    createElement(View, { className: className ?? 'flex-1', style }, children),
  );
}

export type OnGradientScopeProps = {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Vùng trên nền gradient đậm: on-primary (class + useTheme) = trắng ở cả hai giao diện. */
export function OnGradientScope({ children, className, style }: OnGradientScopeProps) {
  const scheme = useScheme();
  const parent = useContext(ThemeScopeContext);
  const onWhite = useMemo(() => vars({ '--color-on-primary': rgbChannels(colors[scheme].onAccent) }), [scheme]);
  const value = useMemo(() => ({ ...parent, onGradient: true }), [parent]);
  return createElement(
    ThemeScopeContext.Provider,
    { value },
    createElement(View, { className, style: [onWhite, style] }, children),
  );
}

/** Bật Reduce Motion → animation chỉ fade `motion.reduced` (150ms). */
export { useReducedMotion };

/** Easing dạng timing có trong token motion ('spring' của motion.base dùng withSpring). */
export type TimingEasing = 'ease-out' | 'ease-in-out';

const EASING: Record<TimingEasing, EasingFunction> = {
  'ease-out': Easing.out(Easing.ease),
  'ease-in-out': Easing.inOut(Easing.ease),
};

/** Easing của token (`t.motion.*.easing`, trừ 'spring') → hàm Easing của Reanimated cho withTiming. */
export function easingOf(name: TimingEasing): EasingFunction {
  return EASING[name];
}
