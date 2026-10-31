// Nhận diện 6 dịch vụ: icon Lucide + class màu (nền nhạt / icon) từ preset @hp/tokens. Một nơi cho ServiceTile,
// ảnh giữ chỗ của ListingCard, màn "sắp ra mắt". Khớp web: pass Package · room House · job Briefcase ·
// lostFound Search · ride Car · sport Trophy.
import type { ServiceKey } from '@hp/tokens';
import { Briefcase, Car, House, type LucideIcon, Package, Search, Trophy } from 'lucide-react-native';

export type { ServiceKey };

// Class đầy đủ để Tailwind quét được (không ghép chuỗi động).
export const SERVICE: Record<ServiceKey, { icon: LucideIcon; soft: string }> = {
  pass: { icon: Package, soft: 'bg-service-pass-soft' },
  room: { icon: House, soft: 'bg-service-room-soft' },
  job: { icon: Briefcase, soft: 'bg-service-job-soft' },
  lostFound: { icon: Search, soft: 'bg-service-lost-found-soft' },
  ride: { icon: Car, soft: 'bg-service-ride-soft' },
  sport: { icon: Trophy, soft: 'bg-service-sport-soft' },
};
