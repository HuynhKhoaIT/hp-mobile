// Chân trang Hub trên điện thoại (docs/design/home.md §4.9; style Stitch): hàng đổi ngôn ngữ (đang chọn: primary đậm gạch
// chân) + link pháp lý ngăn bởi "·". Khách đổi ngôn ngữ ngay ở trang chủ, không phải vào trang Tôi. Dòng miễn trừ
// "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" do layout (app) hiện ngay dưới (MobileDisclaimer) — không lặp ở đây.
// Từ 640px: SiteFooter của layout đã có đủ ngôn ngữ / pháp lý → khối này ẩn. Server Component (LocaleSwitcher là client).
import { getTranslations } from 'next-intl/server';
import { LEGAL_LINKS } from '@/components/shared/legal-links';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { Link } from '@/i18n/navigation';

/** Link pháp lý gọn (bỏ "Xoá tài khoản" — nằm ở trang Tôi / Cài đặt và footer desktop). */
const HUB_LEGAL_KEYS: ReadonlySet<string> = new Set(['about', 'terms', 'privacy', 'contact']);

export async function HubFooter() {
  const t = await getTranslations('web.legal');
  const links = LEGAL_LINKS.filter((l) => HUB_LEGAL_KEYS.has(l.key));
  return (
    <div className="-mb-2 flex flex-col items-center gap-1 border-t border-border pt-4 sm:hidden">
      <LocaleSwitcher variant="inline" />
      <ul className="flex flex-wrap items-center justify-center gap-x-1">
        {links.map(({ href, key }, i) => (
          <li key={key} className="flex items-center gap-x-1">
            {i > 0 ? (
              <span aria-hidden className="text-sm text-muted">
                ·
              </span>
            ) : null}
            <Link
              href={href}
              className="inline-flex min-h-11 items-center rounded-sm px-1.5 text-sm text-muted outline-none hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
