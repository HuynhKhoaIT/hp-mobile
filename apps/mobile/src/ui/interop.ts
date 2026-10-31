// Đăng ký className (NativeWind) cho component ngoài React Native lõi — một lần ở đây:
// Animated.View của Reanimated và Image của expo-image. Component trong @/ui import từ file này.
import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

cssInterop(Animated.View, { className: 'style' });
cssInterop(ExpoImage, { className: 'style' });

export const AnimatedView = Animated.View;
export const Image = ExpoImage;
