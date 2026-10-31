// Screen type: Hub
// Dự phòng: nếu hệ điều hành mở thẳng hoaphat://auth/callback (thay vì trả về phiên trình duyệt), về trang chủ.
// Việc đổi code lấy phiên do signInWithGoogleApp (src/core/auth) làm.
import { Redirect } from 'expo-router';

export default function AuthCallback() {
  return <Redirect href="/" />;
}
