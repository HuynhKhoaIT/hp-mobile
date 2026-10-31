// BottomSheet — @gorhom/bottom-sheet theo token (nền surface, bo lg, nền mờ chạm để đóng), cao theo nội dung.
// Điều khiển bằng `open` + `onClose`. Dùng cho Select, xác nhận hành động khó hoàn tác (nút ghi rõ việc, không "OK").
import { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.4} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onClose}
      enableDynamicSizing
      animateOnMount={!reduced}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: t.colors.surface, borderRadius: t.radius.lg }}
      handleIndicatorStyle={{ backgroundColor: t.colors.border, width: t.space[8] + t.space[2] }}
      accessibilityLabel={title}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + t.space[4] }}>
        <View className="gap-4 px-4 pt-2">
          {title ? (
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
