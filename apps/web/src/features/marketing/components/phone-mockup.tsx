// Ảnh chụp app thật (dữ liệu mẫu, không người thật) trong 2 khung điện thoại: trang chủ phía trước, danh sách tin
// nghiêng phía sau (từ 640px). Chụp lại 2026-11-10 sau khi đổi giao diện theo thiết kế Stitch. Ảnh WebP 600px trong public/marketing (nguồn: chụp bản web của app ở khổ 390, xem
// docs/plan/web.md). Khung trước nổi nhẹ bằng animate-float; giảm chuyển động → đứng yên.
import Image from 'next/image';
import { cn } from '@/lib/utils';

const SHOT = { width: 600, height: 1298 } as const;

function Phone({ src, alt, priority, className }: { src: string; alt: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-surface p-1.5 shadow-card ring-1 ring-border', className)}>
      <Image src={src} alt={alt} {...SHOT} priority={priority} sizes="(min-width: 640px) 240px, 224px" className="h-auto w-full rounded-lg" />
    </div>
  );
}

export function PhoneMockup({ label }: { label: string }) {
  return (
    <div className="relative w-56 shrink-0 sm:ml-24 sm:w-60">
      <Phone
        src="/marketing/app-listings.webp"
        alt=""
        className="absolute top-10 -left-24 hidden w-52 -rotate-6 opacity-95 sm:block"
      />
      <Phone src="/marketing/app-home.webp" alt={label} priority className="relative rotate-2 motion-safe:animate-float" />
    </div>
  );
}
