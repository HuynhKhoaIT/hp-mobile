// StickyCta — thanh hành động dính đáy màn chi tiết (Nhắn tin / Gọi / Tham gia). Đặt ngoài vùng cuộn,
// trong <Screen> (Screen đã chừa vùng an toàn đáy). Tối đa 1 nút chính (Button fullWidth).
// `elevated` (chi tiết tin, style Stitch): thanh nền surface tràn mép màn (-mx-4 px-4) + shadow-bar thay cho viền trên.
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function StickyCta({ children, elevated = false }: { children: ReactNode; elevated?: boolean }) {
  return (
    <View
      className={
        elevated ? '-mx-4 gap-2 border-t border-border bg-surface px-4 pb-2 pt-3 shadow-bar' : 'gap-3 border-t border-border bg-bg pb-2 pt-3'
      }
    >
      {children}
    </View>
  );
}
