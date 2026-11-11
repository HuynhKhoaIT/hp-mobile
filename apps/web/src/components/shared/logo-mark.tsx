// LogoMark — biểu tượng app (ô primary bo góc + ghim vị trí on-primary + chấm accent = "quanh khu làm việc"), giống app
// (`src/ui/LogoMark.tsx`). Không dùng logo / nhận diện Hòa Phát. Trang trí (aria-hidden). Tách khỏi logo.tsx (server)
// để dùng được trong component client (hero màn đăng nhập). size 'sm' (header) size-8 · 'lg' (đăng nhập, style Stitch) size-14.
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LogoMark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 items-center justify-center bg-primary shadow-card',
        lg ? 'size-14 rounded-lg' : 'size-8 rounded-md',
      )}
    >
      <MapPin strokeWidth={2.25} className={cn('text-on-primary', lg ? 'size-7' : 'size-5')} />
      <span
        className={cn(
          'absolute rounded-full bg-accent ring-2 ring-surface',
          lg ? '-top-1 -right-1 size-3.5' : '-top-0.5 -right-0.5 size-2.5',
        )}
      />
    </span>
  );
}
