// Form đăng / sửa tin đang tải (hồ sơ, tin cần sửa): đúng hình bước 1 — nhãn bước, tiêu đề, lưới ảnh 3 cột, nút.
import { View } from 'react-native';
import { Col, Skeleton } from '@/ui';

export function ListingFormSkeleton() {
  return (
    <Col gap={4} className="pt-2">
      <Skeleton className="h-6 w-1/3 rounded-full" />
      <Skeleton className="h-7 w-1/2" />
      <View className="-m-1 flex-row flex-wrap">
        {[0, 1, 2].map((i) => (
          <View key={i} className="w-1/3 p-1">
            <Skeleton className="aspect-avatar w-full" />
          </View>
        ))}
      </View>
      <Skeleton className="h-12 w-full" />
    </Col>
  );
}
