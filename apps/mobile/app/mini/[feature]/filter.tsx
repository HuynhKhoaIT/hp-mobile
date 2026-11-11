// Screen type: Form
// Màn "Bộ lọc & tìm kiếm" của mini-app (Stitch "Bộ lọc & Tìm kiếm"): sửa bản nháp bộ lọc (từ khoá + lịch sử, danh mục + loại
// đồ, khu + khoảng cách, giá, tình trạng, sắp xếp) → "Áp dụng" ghi vào phiên mini-app và về trang chủ. Thanh tab vẫn hiện.
import { MiniFilter } from '@/features/listing/components/mini/MiniFilter';
import { Screen } from '@/ui';

export default function MiniFilterScreen() {
  return (
    <Screen tab keyboard statusBar="primary">
      <MiniFilter />
    </Screen>
  );
}
