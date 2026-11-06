'use client';
// Link prefetch theo ý định: chỉ tải trước khi rê chuột / chạm / focus vào link. Mặc định của Next tải trước MỌI link trong màn
// hình; Hub có ~20 link nên vừa mở trang đã tải thêm khoảng 1 MB (tốn dữ liệu 4G, tranh băng thông với trang đang xem).
import { type ComponentProps, useState } from 'react';
import { BaseLink } from './navigation-base';

export function Link({ prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof BaseLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <BaseLink
      {...props}
      prefetch={intent ? prefetch : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
}
