// Sinh theme.css (Tailwind v4 @theme) từ src/index.ts. Chạy: pnpm --filter @hp/tokens build
// Tên class giống app: bg-primary, bg-primary-light, bg-surface-2, text-muted, rounded-md, shadow-card, bg-service-pass-soft + text-service-pass.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors, font, radius, serviceColors, shadow, type ColorToken } from '../src/index.ts';

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
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const px = (n: number) => `${n}px`;

const colorVars = (scheme: 'light' | 'dark', indent: string) =>
  (Object.keys(COLOR_NAME) as ColorToken[]).map((k) => `${indent}--color-${COLOR_NAME[k]}: ${colors[scheme][k]};`).join('\n');

const serviceVars = (scheme: 'light' | 'dark', indent: string) =>
  Object.entries(serviceColors[scheme]).flatMap(([k, v]) => [
    `${indent}--color-service-${kebab(k)}: ${v.fg};`,
    `${indent}--color-service-${kebab(k)}-soft: ${v.soft};`,
  ]);

const lines = [
  '/* SINH TỰ ĐỘNG từ packages/tokens/src/index.ts — không sửa tay. Chạy: pnpm --filter @hp/tokens build */',
  '',
  '@theme {',
  colorVars('light', '  '),
  ...serviceVars('light', '  '),
  '',
  ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${k === 'full' ? '9999px' : px(v)};`),
  '',
  ...Object.entries(font.size).flatMap(([k, v]) => [
    `  --text-${k}: ${px(v)};`,
    `  --text-${k}--line-height: ${font.lineHeightRatio};`,
  ]),
  '',
  `  --shadow-card: ${shadow.card.x}px ${shadow.card.y}px ${shadow.card.blur}px ${shadow.card.color};`,
  '  --font-sans: var(--font-be-vietnam-pro), system-ui, sans-serif;',
  '  --font-zh: var(--font-noto-sans-sc), var(--font-be-vietnam-pro), sans-serif;',
  '}',
  '',
  '/* Dark mode bằng class `dark` trên <html> (next-themes). */',
  '.dark {',
  colorVars('dark', '  '),
  ...serviceVars('dark', '  '),
  '}',
  '',
];

const out = join(import.meta.dirname, '..', 'theme.css');
writeFileSync(out, lines.join('\n'));
console.log(`theme.css đã sinh (${lines.length} dòng)`);
