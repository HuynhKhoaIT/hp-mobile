// Trang chủ (/) — kiểu super app: lưới module dịch vụ + tiện ích, dải tin từng dịch vụ (features/home).
// Nằm trong khu (app) để có header tìm kiếm + thanh điều hướng dưới như app. Landing giới thiệu: /gioi-thieu (tuần 11).
import { HomePage } from '@/features/home/components/home-page';

export default function Page() {
  return <HomePage />;
}
