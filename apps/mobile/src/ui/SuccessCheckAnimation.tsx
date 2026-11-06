// Dấu tích Lottie của SuccessScreen: vòng tròn rồi dấu tích vẽ dần, 0,8 giây, chạy một lần rồi đứng ở khung cuối.
// JSON giữ màu trung tính, tô màu token qua colorFilters (keypath = tên layer). Chỉ tải qua React.lazy trong SuccessScreen.
import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import successCheck from '../../assets/lottie/success-check.json';
import { useTheme } from './theme';

export default function SuccessCheckAnimation() {
  const { colors } = useTheme();
  return (
    // Trang trí: tiêu đề bên cạnh đã nói kết quả, trình đọc màn hình bỏ qua; không nhận chạm.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" className="absolute inset-0">
      <LottieView
        source={successCheck}
        autoPlay
        loop={false}
        resizeMode="contain"
        colorFilters={[
          { keypath: 'ring', color: colors.success },
          { keypath: 'check', color: colors.success },
        ]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
