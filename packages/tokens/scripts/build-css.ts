// Sinh từ src/index.ts. Chạy: pnpm --filter @hp/tokens build
//   theme.css            Tailwind v4 @theme cho web
//   tailwind.preset.cjs  preset Tailwind v3 cho NativeWind 4 (app); biến màu ở :root + media dark
//                        (NativeWind đổi theo Appearance.setColorScheme nên Cài đặt sáng / tối vẫn có tác dụng)
// Tên class giống app: bg-primary, bg-primary-light, bg-surface-2, text-muted, rounded-md, shadow-card / shadow-bar / shadow-fab, bg-service-pass-soft + text-service-pass.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  appThemes,
  aspect,
  colors,
  font,
  gradients,
  motion,
  radius,
  serviceColors,
  shadow,
  shimmer,
  type ColorScheme,
  type ColorToken,
} from '../src/index.ts';

// Tên token → tên biến CSS (class Tailwind). text* đổi tên để tránh "text-text".
const COLOR_NAME: Record<ColorToken, string> = {
  primary: 'primary',
  primaryLight: 'primary-light',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  bg: 'bg',
  surface: 'surface',
  surface2: 'surface-2',
  border: 'border',
  text: 'fg',
  textMuted: 'muted',
  textDisabled: 'disabled',
  onPrimary: 'on-primary',
  onAccent: 'on-accent',
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const px = (n: number) => `${n}px`;
const shadowCss = ({ x, y, blur, color }: { x: number; y: number; blur: number; color: string }) =>
  `${px(x)} ${px(y)} ${px(blur)} ${color}`;

const colorVars = (scheme: 'light' | 'dark', indent: string) =>
  (Object.keys(COLOR_NAME) as ColorToken[]).map((k) => `${indent}--color-${COLOR_NAME[k]}: ${colors[scheme][k]};`).join('\n');

// Gradient header (class from-app-from / to-app-to): mặc định = thương hiệu super app; mini-app ghi đè ([data-app-theme]).
const appGradientVars = (indent: string) => [
  `${indent}--color-app-from: ${gradients.brand[0]};`,
  `${indent}--color-app-to: ${gradients.brand[1]};`,
];

// Màu chủ đạo của từng mini-app (appThemes): khung mini-app gắn data-app-theme="<key>" → các biến dưới đây thay giá trị mặc định.
const appThemeBlocks = (scheme: 'light' | 'dark') =>
  Object.entries(appThemes[scheme]).flatMap(([k, v]) => [
    `${scheme === 'dark' ? '.dark ' : ''}[data-app-theme='${kebab(k)}'] {`,
    `  --color-primary: ${v.primary};`,
    `  --color-primary-light: ${v.primaryLight};`,
    `  --color-on-primary: ${v.onPrimary};`,
    `  --color-app-from: ${v.gradient[0]};`,
    `  --color-app-to: ${v.gradient[1]};`,
    '}',
  ]);

const serviceVars = (scheme: 'light' | 'dark', indent: string) =>
  Object.entries(serviceColors[scheme]).flatMap(([k, v]) => [
    `${indent}--color-service-${kebab(k)}: ${v.fg};`,
    `${indent}--color-service-${kebab(k)}-soft: ${v.soft};`,
  ]);

// Animation web (Tailwind v4: --animate-* → class animate-*, @keyframes trong @theme chỉ xuất khi class được dùng).
// Thời lượng / easing / biên độ lấy từ motion; dùng kèm motion-safe: hoặc tắt bằng motion-reduce: ở component.
const ms = (n: number) => `${n}ms`;
const { shimmer: sh, ambient, ripple } = motion;
const animate = [
  `  --animate-skeleton-shimmer: skeleton-shimmer ${ms(sh.duration)} ${sh.easing} infinite;`,
  `  --animate-fab-glow: fab-glow ${ms(ambient.glow.duration)} ${ambient.glow.easing} infinite;`,
  `  --animate-badge-float: badge-float ${ms(ambient.float.duration)} ${ambient.float.easing} infinite;`,
  `  --animate-success-ripple: success-ripple ${ms(ripple.duration)} ${ripple.easing} ${ms(ripple.delay)} 1 forwards;`,
  '',
  // Dải rộng `band` × khối: bắt đầu ngoài mép trái (−150% bề rộng dải, chừa phần nghiêng), kết thúc ngoài mép phải.
  '  @keyframes skeleton-shimmer {',
  `    from { transform: translateX(-150%) skewX(${sh.skewDeg}deg); }`,
  `    to { transform: translateX(${Math.round(100 / sh.band + 50)}%) skewX(${sh.skewDeg}deg); }`,
  '  }',
  '  @keyframes fab-glow {',
  '    0%, 100% { opacity: 0; transform: scale(1); }',
  `    50% { opacity: 1; transform: scale(${ambient.glow.scale}); }`,
  '  }',
  '  @keyframes badge-float {',
  '    0%, 100% { transform: translateY(0); }',
  `    50% { transform: translateY(${px(ambient.float.translateY)}); }`,
  '  }',
  '  @keyframes success-ripple {',
  `    from { opacity: ${ripple.opacity}; transform: scale(1); }`,
  `    to { opacity: 0; transform: scale(${ripple.scale}); }`,
  '  }',
];

const lines = [
  '/* SINH TỰ ĐỘNG từ packages/tokens/src/index.ts — không sửa tay. Chạy: pnpm --filter @hp/tokens build */',
  '',
  '@theme {',
  colorVars('light', '  '),
  ...serviceVars('light', '  '),
  ...appGradientVars('  '),
  '',
  ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${k === 'full' ? '9999px' : px(v)};`),
  '',
  ...Object.entries(font.size).flatMap(([k, v]) => [
    `  --text-${k}: ${px(v)};`,
    `  --text-${k}--line-height: ${font.lineHeightRatio};`,
  ]),
  '',
  ...Object.entries(shadow).map(([k, v]) => `  --shadow-${k}: ${shadowCss(v)};`),
  ...Object.entries(aspect).map(([k, v]) => `  --aspect-${k}: ${v};`),
  `  --color-shimmer: ${shimmer.light};`,
  '  --font-sans: var(--font-be-vietnam-pro), system-ui, sans-serif;',
  "  --font-zh: var(--font-be-vietnam-pro), 'Noto Sans SC', 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;",
  '',
  ...animate,
  '}',
  '',
  '/* Dark mode bằng class `dark` trên <html> (next-themes). */',
  '.dark {',
  colorVars('dark', '  '),
  ...serviceVars('dark', '  '),
  `  --color-shimmer: ${shimmer.dark};`,
  '}',
  '',
  '/* Mini-app (Chợ Pass, Nhà trọ, …): khung gắn data-app-theme="<key>" — màu chủ đạo riêng (appThemes). */',
  ...appThemeBlocks('light'),
  ...appThemeBlocks('dark'),
  '',
];

const out = join(import.meta.dirname, '..', 'theme.css');
writeFileSync(out, lines.join('\n'));
console.log(`theme.css đã sinh (${lines.length} dòng)`);


// ── tailwind.preset.cjs (NativeWind 4 / Tailwind v3) ──────────────────────────────
// Màu dạng "R G B" để dùng được bg-primary/10. Bảng màu mặc định Tailwind bị thay hẳn: chỉ có màu token.
const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const colorNames = [
  ...(Object.keys(COLOR_NAME) as ColorToken[]).map((k) => COLOR_NAME[k]),
  ...Object.keys(serviceColors.light).flatMap((k) => [`service-${kebab(k)}`, `service-${kebab(k)}-soft`]),
  'app-from',
  'app-to',
];
const rootVars = (scheme: ColorScheme) =>
  Object.fromEntries([
    ...(Object.keys(COLOR_NAME) as ColorToken[]).map((k) => [`--color-${COLOR_NAME[k]}`, rgb(colors[scheme][k])]),
    ...Object.entries(serviceColors[scheme]).flatMap(([k, v]) => [
      [`--color-service-${kebab(k)}`, rgb(v.fg)],
      [`--color-service-${kebab(k)}-soft`, rgb(v.soft)],
    ]),
    ['--color-app-from', rgb(gradients.brand[0])],
    ['--color-app-to', rgb(gradients.brand[1])],
  ]);
const preset = {
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...Object.fromEntries(colorNames.map((n) => [n, `rgb(var(--color-${n}) / <alpha-value>)`])),
    },
    borderRadius: {
      none: '0px',
      ...Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, k === 'full' ? '9999px' : px(v)])),
    },
    // React Native cần line-height tuyệt đối: size × 1,4 làm tròn.
    fontSize: Object.fromEntries(
      Object.entries(font.size).map(([k, v]) => [k, [px(v), { lineHeight: px(Math.round(v * font.lineHeightRatio)) }]]),
    ),
    // Android không tự chọn file font theo fontWeight → mỗi weight một family. Dùng qua @/ui/Text (prop weight).
    fontFamily: {
      sans: [font.family.regular],
      'sans-medium': [font.family.medium],
      'sans-semibold': [font.family.semibold],
      'sans-bold': [font.family.bold],
      zh: [font.family.zh],
    },
    extend: {
      boxShadow: Object.fromEntries(Object.entries(shadow).map(([k, v]) => [k, shadowCss(v)])),
      aspectRatio: aspect,
    },
  },
};
const presetBody = JSON.stringify(preset, null, 2).slice(1, -2).replace(/\n {2}/g, '\n  ');
writeFileSync(
  join(import.meta.dirname, '..', 'tailwind.preset.cjs'),
  [
    '/* SINH TỰ ĐỘNG từ packages/tokens/src/index.ts — không sửa tay. Chạy: pnpm --filter @hp/tokens build */',
    '/* Preset Tailwind v3 cho NativeWind 4 (apps/mobile). Web dùng theme.css (Tailwind v4). Cùng tên class. */',
    '',
    `const light = ${JSON.stringify(rootVars('light'), null, 2)};`,
    '',
    `const dark = ${JSON.stringify(rootVars('dark'), null, 2)};`,
    '',
    `module.exports = {${presetBody},`,
    '  plugins: [',
    "    ({ addBase }) => addBase({ ':root': light, '@media (prefers-color-scheme: dark)': { ':root': dark } }),",
    '  ],',
    '};',
    '',
  ].join('\n'),
);
console.log('tailwind.preset.cjs đã sinh');
