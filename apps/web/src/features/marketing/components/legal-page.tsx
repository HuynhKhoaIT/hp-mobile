// Khung trang pháp lý (bảo mật, điều khoản, xoá tài khoản, liên hệ). Nội dung thật viết bằng MDX
// (content/legal/{vi,en,zh}/<slug>.mdx) trước khi lên store — tuần 11; hiện hiển thị thông báo đang soạn.
import type { ReactNode } from 'react';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-semibold text-fg">{title}</h1>
      <div className="flex flex-col gap-4 text-md text-fg">{children}</div>
    </article>
  );
}
