// StickyCta — thanh hành động dính đáy màn chi tiết (Nhắn tin / Gọi / Tham gia). Đặt ngoài vùng cuộn,
// trong <Screen> (Screen đã chừa vùng an toàn đáy). Tối đa 1 nút chính (Button fullWidth).
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function StickyCta({ children }: { children: ReactNode }) {
  return <View className="gap-3 border-t border-border bg-bg pb-2 pt-3">{children}</View>;
}
