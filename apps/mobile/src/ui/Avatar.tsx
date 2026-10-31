// Avatar — ảnh tròn (expo-image, cache memory-disk) hoặc chữ cái đầu khi chưa có ảnh. Cỡ sm 32 · md 40 · lg 64.
import { Image } from './interop';
import { View } from 'react-native';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg';
const BOX: Record<AvatarSize, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-16 w-16' };

/** "Nguyễn Văn An" → "A" (tên gọi là từ cuối trong tiếng Việt). */
function initial(name: string) {
  const last = name.trim().split(/\s+/).pop() ?? '';
  return last.charAt(0).toUpperCase();
}

export function Avatar({ uri, name, size = 'md' }: { uri?: string | null; name: string; size?: AvatarSize }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      className={`items-center justify-center overflow-hidden rounded-full bg-primary-light ${BOX[size]}`}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" cachePolicy="memory-disk" className="h-full w-full" />
      ) : (
        <Text variant={size === 'lg' ? 'heading' : 'label'} tone="primary">
          {initial(name)}
        </Text>
      )}
    </View>
  );
}
