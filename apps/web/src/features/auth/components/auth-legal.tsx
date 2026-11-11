'use client';

// Chân bước nhập số điện thoại (style Stitch "Đăng nhập gọn nhẹ"), giống app (`AuthLegal.tsx`): link Điều khoản sử dụng ·
// Chính sách bảo mật (mở tab mới) + dòng miễn trừ khi `disclaimer` (LoginDialog — trang /dang-nhap đã có miễn trừ ở chân
// layout). Việc đồng ý điều khoản vẫn là ô tích bắt buộc ở bước 2 onboarding — dòng này chỉ để đọc trước.
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const LINKS = [
  { href: '/dieu-khoan', key: 'terms' },
  { href: '/chinh-sach-bao-mat', key: 'privacy' },
] as const;

export function AuthLegal({ disclaimer = false }: { disclaimer?: boolean }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted">
        {LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-2">
            {i > 0 ? <span aria-hidden>·</span> : null}
            <Link href={link.href} target="_blank" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              {t(`auth.onboarding.${link.key}`)}
            </Link>
          </span>
        ))}
      </p>
      {disclaimer ? <p className="text-xs text-muted">{t('common.disclaimer')}</p> : null}
    </div>
  );
}
