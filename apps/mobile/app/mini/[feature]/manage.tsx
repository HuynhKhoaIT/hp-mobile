// Screen type: List
// Tab "Quản lý tin" của mini-app (Stitch "Quản lý tin đăng"): hồ sơ + số liệu của tính năng, tab vòng đời có số, tìm / sắp
// tại chỗ, thẻ tin với thao tác theo tab. Khách → mời đăng nhập.
import { MiniManage } from '@/features/listing/components/mini/MiniManage';
import { Screen } from '@/ui';

export default function MiniManageScreen() {
  return (
    <Screen tab statusBar="primary">
      <MiniManage />
    </Screen>
  );
}
