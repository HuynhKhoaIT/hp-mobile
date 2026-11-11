// Hoạ tiết nền của dải header xanh (style Stitch, nhẹ): vòng tròn on-primary mờ + vòng nét đứt lồng ngoài ở góc phải, một
// đốm nhỏ — trang trí, ẩn với trình đọc màn hình, không nhận chạm. Dùng chung trang chủ (HubHeader) và trang "Tôi"
// (MyAccount) để hai header xanh cùng kiểu; giống app (HomeHeader). Khối cha cần `relative` (+ `overflow-hidden` nếu bo góc).
import { cn } from '@/lib/utils';

export function HeaderDecor({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <span className="absolute -top-16 -right-12 size-40 rounded-full bg-on-primary/10 sm:-top-32 sm:right-16 sm:size-64" />
      <span className="absolute -top-24 -right-20 size-56 rounded-full border-2 border-dashed border-on-primary/15 sm:-top-44 sm:right-6 sm:size-88" />
      <span className="absolute top-12 right-28 size-12 rounded-full bg-on-primary/10 sm:top-14 sm:right-1/4 sm:size-16" />
    </div>
  );
}
