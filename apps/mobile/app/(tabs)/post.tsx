// Screen type: Hub
// Tab Đăng: bước 0 của "Đăng nhanh" — chọn loại tin rồi danh mục → form listing/new/[category] (khách → đăng nhập trước).
// Ghép xe / ghép trận (Group) thêm ở tuần 7–8. Config 4 tính năng (icon thẻ danh mục) lấy từ registry features/configs.
import { LISTING_CONFIGS } from '@/features/configs';
import { PostPicker } from '@/features/listing/components/PostPicker';
import { Screen, Spacer } from '@/ui';

export default function PostTabScreen() {
  return (
    <Screen scroll tab>
      <Spacer size={4} />
      <PostPicker configs={LISTING_CONFIGS} />
    </Screen>
  );
}
