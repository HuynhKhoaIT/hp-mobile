// Footer: luôn có dòng "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" (apps/web/CLAUDE.md mục 1).
// Link pháp lý (bảo mật, điều khoản, xoá tài khoản, liên hệ) thêm khi có trang (tuần 11).
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { cacheLife } from 'next/cache';

async function copyrightYear() {
  'use cache';
  // Năm thay đổi mỗi năm một lần: cache theo ngày, không làm footer thành dynamic.
  cacheLife('days');
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted">
        <p>{t('common.disclaimer')}</p>
        <p>{t('web.footer.rights', { year: await copyrightYear(), appName: APP_NAME })}</p>
      </div>
    </footer>
  );
}
