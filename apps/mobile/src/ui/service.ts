// Nhận diện 6 dịch vụ: icon Lucide + class màu (nền nhạt / icon) từ preset @hp/tokens. Một nơi cho ServiceTile,
// ảnh giữ chỗ của ListingCard, màn "sắp ra mắt", banner / chip / tiêu đề dải ở Hub. Khớp web: pass Package · room House · job Briefcase ·
// lostFound Search · ride Car · sport Trophy.
import type { ServiceKey } from '@hp/tokens';
import { Briefcase, Car, House, type LucideIcon, Package, Search, Trophy } from 'lucide-react-native';

export type { ServiceKey };

// Class đầy đủ để Tailwind quét được (không ghép chuỗi động).
// soft: nền nhạt (ô icon, banner tone dịch vụ) · dot: chấm màu đậm (chip Tìm nhanh).
export const SERVICE: Record<ServiceKey, { icon: LucideIcon; soft: string; dot: string }> = {
  pass: { icon: Package, soft: 'bg-service-pass-soft', dot: 'bg-service-pass' },
  room: { icon: House, soft: 'bg-service-room-soft', dot: 'bg-service-room' },
  job: { icon: Briefcase, soft: 'bg-service-job-soft', dot: 'bg-service-job' },
  lostFound: { icon: Search, soft: 'bg-service-lost-found-soft', dot: 'bg-service-lost-found' },
  ride: { icon: Car, soft: 'bg-service-ride-soft', dot: 'bg-service-ride' },
  sport: { icon: Trophy, soft: 'bg-service-sport-soft', dot: 'bg-service-sport' },
};
