// Khối mở đầu các bước đăng nhập (style Stitch "Nhập mã OTP", "Chọn nơi làm việc"), giống app (`features/auth/components/
// AuthHero.tsx`): ô icon + tiêu đề (h1) + câu phụ. `center` (bước OTP): ô size-14 rounded-lg nền primary icon on-primary +
// chấm accent có dấu tích ở góc, chữ căn giữa. `inline` (các bước onboarding): ô size-12 nền primary-light icon primary bên
// trái tiêu đề. Ô icon chỉ trang trí (aria-hidden).
import { Check, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthHero({
  icon: Icon,
  title,
  subtitle,
  variant = 'inline',
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  variant?: 'center' | 'inline';
  /** Nội dung thêm dưới câu phụ (vd viên số điện thoại + Đổi số ở bước OTP). */
  children?: ReactNode;
}) {
  if (variant === 'center') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <span aria-hidden className="relative mb-1 flex size-14 items-center justify-center rounded-lg bg-primary shadow-card">
          <Icon className="size-7 text-on-primary" strokeWidth={1.75} />
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-accent ring-2 ring-surface">
            <Check className="size-3 text-on-accent" strokeWidth={3} />
          </span>
        </span>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {subtitle ? <p className="text-md text-muted">{subtitle}</p> : null}
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary-light">
          <Icon className="size-6 text-primary" strokeWidth={1.75} />
        </span>
        <h1 className="text-2xl font-bold text-fg">{title}</h1>
      </div>
      {subtitle ? <p className="text-md text-muted">{subtitle}</p> : null}
      {children}
    </div>
  );
}
