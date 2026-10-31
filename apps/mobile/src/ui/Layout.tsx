// Row / Col / Spacer / Divider — bố cục theo thang khoảng cách token (gap 1–8 = 4–32px).
// Dùng thay cho <View style={{ padding, gap }}> tự viết trong feature.
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export type SpaceStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8;

// Class đầy đủ để Tailwind quét được.
const GAP: Record<SpaceStep, string> = { 0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8' };
const HEIGHT: Record<SpaceStep, string> = { 0: 'h-0', 1: 'h-1', 2: 'h-2', 3: 'h-3', 4: 'h-4', 5: 'h-5', 6: 'h-6', 8: 'h-8' };
const ALIGN = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' } as const;
const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' } as const;

type StackProps = ViewProps & {
  gap?: SpaceStep;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  wrap?: boolean;
  className?: string;
  children?: ReactNode;
};

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Row({ gap = 2, align = 'center', justify = 'start', wrap = false, className, ...rest }: StackProps) {
  return <View className={join('flex-row', GAP[gap], ALIGN[align], JUSTIFY[justify], wrap && 'flex-wrap', className)} {...rest} />;
}

export function Col({ gap = 2, align = 'stretch', justify = 'start', className, ...rest }: Omit<StackProps, 'wrap'>) {
  return <View className={join('flex-col', GAP[gap], ALIGN[align], JUSTIFY[justify], className)} {...rest} />;
}

/** Khoảng trống dọc theo token, hoặc `flex` để đẩy phần sau xuống cuối. */
export function Spacer({ size = 4, flex = false }: { size?: SpaceStep; flex?: boolean }) {
  return <View className={flex ? 'flex-1' : HEIGHT[size]} />;
}

export function Divider({ className }: { className?: string }) {
  return <View accessibilityElementsHidden className={join('h-px w-full bg-border', className)} />;
}
