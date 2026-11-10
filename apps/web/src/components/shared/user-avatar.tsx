// Ảnh đại diện tròn của người dùng (hộp thư, khung chat): ảnh (path avatars / URL Google) hoặc chữ cái đầu trên nền
// primary-light — giống Avatar của app. Ảnh đã là bản thu nhỏ sẵn (profileAvatarUrl) nên `unoptimized`.
import Image from 'next/image';
import { profileAvatarUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { box: 'size-9 text-md', px: '36px' },
  md: { box: 'size-12 text-lg', px: '48px' },
} as const;

export function UserAvatar({
  avatar,
  name,
  size = 'md',
  className,
}: {
  /** Giá trị avatar_url từ view (path hoặc URL). */
  avatar: string | null | undefined;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const src = profileAvatarUrl(avatar);
  const s = SIZE[size];
  return (
    <span aria-hidden className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full bg-primary-light', s.box, className)}>
      {src ? (
        <Image src={src} alt="" fill unoptimized sizes={s.px} className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center font-semibold text-primary">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
