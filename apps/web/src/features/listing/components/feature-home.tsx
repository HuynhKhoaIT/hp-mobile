// Trang chủ mini của một tính năng Listing (config.home — Pass đồ "Trang chủ riêng", cùng thứ tự khối với app). Trang danh
// sách hiện khối này khi CHƯA lọc / sắp xếp, giữa header xanh (ô tìm) và mục "Tất cả tin {tính năng}":
//   1 lưới danh mục (config.categories theo thứ tự hiển thị, icon config.categoryIcons, nhãn listing.category_short) → link
//     ?category=<mã> (chạy khi tắt JS);
//   2 banner trượt (config.home.bannerPlacement, bảng banners) — rỗng → ẩn, lỗi → tải lại ở trình duyệt / Thử lại;
//   3 các dải config.home.rails theo thứ tự ("Gần {khu}" khu mặc định, "Cho tặng miễn phí", "{danh mục} mới đăng") — rỗng → ẩn.
// Server Component: banner + dải đọc server (cache 300s, tag `banners` / `listings`, dùng chung cache trang đầu danh sách cùng
// bộ lọc) → HTML có tin thật; phần client chỉ để cuộn / tải lại.
import type { Site } from '@hp/core';
import type { Locale } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { getBanners, getListRail } from '@/features/home/queries';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { ListingFeatureConfig } from '../feature-config';
import { homeRailQuery } from '../feature-home';
import { filterQuery } from '../filters';
import { FeatureHomeRail } from './feature-home-rail';

export async function FeatureHome({ cfg, sites, locale }: { cfg: ListingFeatureConfig; sites: Site[]; locale: Locale }) {
  const home = cfg.home;
  if (!home) return null;
  // Khu mặc định = khu đầu tiên theo sort_order (giống dải "Gần {khu}" của trang chủ cho khách / bot).
  const site = sites[0] ? { code: sites[0].code, name: sites[0].name } : null;

  const [banners, rails] = await Promise.all([
    home.bannerPlacement ? getBanners(home.bannerPlacement, locale) : Promise.resolve([]),
    Promise.all(
      home.rails.map(async (rail) => {
        const { size, ...q } = homeRailQuery(cfg, rail, site?.code ?? null);
        return { rail, data: await getListRail(q, size) };
      }),
    ),
  ]);
  // null = lỗi server → carousel tự tải lại ở trình duyệt; [] = không có banner → ẩn khối.
  const hasBanners = banners === null || banners.length > 0;

  return (
    <>
      <CategoryGrid cfg={cfg} />
      {hasBanners && home.bannerPlacement ? <BannerCarousel initial={banners} placement={home.bannerPlacement} /> : null}
      {rails.map(({ rail, data }, i) => (
        <FeatureHomeRail
          key={rail.key}
          feature={cfg.feature}
          rail={rail}
          site={site}
          initial={data}
          // Dải đầu (ngay dưới banner) tải sớm ảnh vài thẻ đầu khi không có banner — LCP.
          priorityCount={i === 0 && !hasBanners ? 2 : 0}
        />
      ))}
    </>
  );
}

/**
 * Lưới danh mục (style ô dịch vụ của trang chủ): thẻ surface, 5 cột trên điện thoại (10 danh mục = 2 hàng), 10 cột từ 1024px.
 * Ô: khung icon 48 bo md nền màu dịch vụ nhạt + icon 24 + nhãn ngắn 1–2 dòng (không cắt chữ). Link thật, chạy khi tắt JS.
 */
async function CategoryGrid({ cfg }: { cfg: ListingFeatureConfig }) {
  const t = await getTranslations();
  const headingId = `${cfg.feature}-categories`;
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-3 py-4 shadow-card sm:p-4">
      <h2 id={headingId} className="px-1 text-md font-semibold text-fg sm:text-lg">
        {t('listing.feature_home.categories_title')}
      </h2>
      <ul className="grid grid-cols-5 gap-x-1 gap-y-3 lg:grid-cols-10 lg:gap-x-2">
        {cfg.categories.map((c) => {
          const Icon = cfg.categoryIcons?.[c] ?? cfg.Icon;
          const label = t(`listing.category_short.${c}`);
          return (
            <li key={c}>
              <Link
                href={{ pathname: cfg.path, query: filterQuery({ category: c }) }}
                // Tên đọc chứa đúng nhãn đang thấy (WCAG 2.5.3).
                aria-label={t('listing.feature_home.category_a11y', { category: label })}
                className={cn(
                  'group flex h-full min-h-12 flex-col items-center gap-2 rounded-md px-0.5 py-1.5 outline-none transition duration-200',
                  'hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 motion-reduce:active:scale-100',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-md transition-transform duration-200',
                    'group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0',
                    cfg.tone.soft,
                  )}
                >
                  <Icon strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
                </span>
                <span aria-hidden className="flex min-h-9 items-start justify-center text-center text-xs leading-tight font-medium text-fg sm:text-sm">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
