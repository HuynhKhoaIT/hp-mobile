// Screen type: List
// Tab "Đã lưu" của mini-app (Stitch "Tin đã lưu"): tin đã lưu thuộc danh mục của tính năng — Tất cả / Đang bán / Ngừng bán,
// bỏ lưu, Chat ngay, Tìm món tương tự. Khách → mời đăng nhập.
import { MiniSaved } from '@/features/listing/components/mini/MiniSaved';
import { Screen } from '@/ui';

export default function MiniSavedScreen() {
  return (
    <Screen tab statusBar="primary">
      <MiniSaved />
    </Screen>
  );
}
