// Khoảng cách gần đúng giữa hai toạ độ (haversine, mét) + thời gian đi xe máy — màn chi tiết phòng trọ: "cách khu X bao xa".
// Toạ độ tin công khai đã làm tròn ~300 m (public_listings) → kết quả chỉ để tham khảo, hiển thị đã làm tròn.

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Khoảng cách đường chim bay (mét). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Tốc độ xe máy trung bình đường khu công nghiệp (km/h) — ước lượng phút đi ca. */
export const MOTORBIKE_KMH = 30;

/** Phút đi xe máy (làm tròn lên, tối thiểu 1) cho quãng đường chim bay `meters`. */
export function motorbikeMinutes(meters: number): number {
  return Math.max(1, Math.ceil((meters / 1000 / MOTORBIKE_KMH) * 60));
}
