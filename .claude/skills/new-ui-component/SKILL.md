---
name: new-ui-component
description: Tạo hoặc mở rộng component trong src/ui (design system) kèm variant, a11y, dark mode, reduce motion và mục trong ui-gallery. Dùng khi thiếu component giao diện hoặc cần thêm variant/prop cho component có sẵn.
argument-hint: "<TênComponent> [mô tả variant/props]"
---

# Component design system

## Bước 1 — Có sẵn chưa?
Đọc `src/ui/index.ts` và danh sách `apps/mobile/CLAUDE.md` mục 5. Có component gần giống → thêm variant/prop thay vì tạo mới. Nếu web (`apps/web/src/components`) đã có component cùng tên → giữ cùng tên prop/variant để AI chuyển màn hình qua lại dễ.

## Bước 2 — Viết `src/ui/<Name>.tsx`
Khuôn:
```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme, useReducedMotion } from './theme';

const styles = cva('rounded-md items-center justify-center', {
  variants: {
    variant: { primary: 'bg-primary', secondary: 'bg-primary-light', outline: 'border border-primary bg-transparent' },
    size: { sm: 'h-9 px-3', md: 'h-11 px-4', lg: 'h-13 px-5' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export type NameProps = VariantProps<typeof styles> & {
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Name({ variant, size, label, onPress, accessibilityLabel }: NameProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <Pressable className={styles({ variant, size })} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={8}>
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}
```
Yêu cầu:
- Chỉ class từ preset `@hp/tokens`; giá trị cho Reanimated qua `useTheme()`.
- `accessibilityRole`; `accessibilityLabel` bắt buộc nếu không có chữ; `hitSlop` khi vùng chạm < 44.
- Không biết theme hiện tại (dark tự theo token).
- Có animation → tôn trọng `useReducedMotion()`; thời lượng từ `t.motion`.
- Props typed, không `any`; export `type <Name>Props`.
- Font scale: vùng chứa chữ nhiều dòng dùng `minHeight`.
- Chữ mẫu / nhãn mặc định qua `t()` (ns `common`), không chuỗi thô.

## Bước 3 — Export và gallery
1. Thêm vào `src/ui/index.ts`.
2. Thêm section vào `app/(dev)/ui-gallery.tsx`: mọi variant × size × trạng thái (disabled, loading, error).
3. Nếu là card/badge/trạng thái → đối chiếu bản web để nhìn giống.

## Bước 4 — Kiểm
```
pnpm tsc --noEmit && pnpm lint
```
Mở gallery ở 360px, font 150%, dark, Reduce Motion. Chụp màn hình gallery để review.
