// Mã QR vẽ ở server thành SVG: không thêm JS cho trình duyệt. Luôn đen trên trắng (kể cả dark mode) để camera đọc được.
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

const QUIET_ZONE = 2;

export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const { size } = modules;
  let d = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  const box = size + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
      shapeRendering="crispEdges"
      className={cn('rounded-md bg-white text-black', className)}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
