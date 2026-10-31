// Layout
// Luồng đăng nhập: phone → otp → onboarding. Không header hệ thống (mỗi màn có <Header> riêng).
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
