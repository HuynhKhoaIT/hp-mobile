// Screen type: Hub
// Trang chủ mini-app (Stitch "Sub-App Chợ Pass"): header xanh cuộn theo danh sách (rời mini-app · tên + MINI-APP · khu · ô tìm)
// → khu làm việc → danh mục → banner / "An tâm trao tay" → chip nhanh → "Tin mới đăng quanh bạn" lưới 2 cột cuộn vô hạn.
// Bộ lọc dùng chung với màn Bộ lọc (phiên mini-app). Mở thẳng từ link (không có màn trước) → Back Android về Hub thay vì
// thoát app.
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { MiniHome } from '@/features/listing/components/mini/MiniHome';
import { Screen } from '@/ui';

export default function MiniHomeScreen() {
  const focused = useIsFocused();
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canDismiss()) return false;
        router.replace('/');
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  return (
    <Screen tab edgeToEdge statusBar="app">
      <MiniHome active={focused} />
    </Screen>
  );
}
