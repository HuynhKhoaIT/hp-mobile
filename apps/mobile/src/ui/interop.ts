// Đăng ký className (NativeWind) cho component ngoài React Native lõi — một lần ở đây:
// Animated.View / Animated.ScrollView của Reanimated và Image của expo-image. Component trong @/ui import từ file này.
import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.ScrollView, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
cssInterop(ExpoImage, { className: 'style' });

export const AnimatedView = Animated.View;
export const AnimatedScrollView = Animated.ScrollView;
export const Image = ExpoImage;
