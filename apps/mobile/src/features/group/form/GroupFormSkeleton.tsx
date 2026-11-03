// Form tạo nhóm đang tải (hồ sơ / danh sách khu): khung đúng hình các ô của GroupForm.
import { View } from 'react-native';
import { Skeleton } from '@/ui';

export function GroupFormSkeleton() {
  return (
    <View className="gap-5 pt-2">
      <View className="flex-row gap-2">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="gap-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-12 w-full rounded-sm" />
        </View>
      ))}
    </View>
  );
}
