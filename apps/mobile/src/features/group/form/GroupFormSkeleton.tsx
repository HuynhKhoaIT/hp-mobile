// Form tạo nhóm đang tải (hồ sơ / danh sách khu): khung đúng hình các khối của GroupForm — tiêu đề khối có vạch + thẻ
// (khối loại: hàng chip; các khối sau: nhãn + ô nhập).
import { View } from 'react-native';
import { Skeleton } from '@/ui';

export function GroupFormSkeleton() {
  return (
    <View className="gap-5">
      <View className="gap-2">
        <Skeleton className="h-5 w-1/3" />
        <View className="flex-row flex-wrap gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} className="gap-2">
          <Skeleton className="h-5 w-2/5" />
          <View className="gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-12 w-full rounded-sm" />
          </View>
        </View>
      ))}
    </View>
  );
}
