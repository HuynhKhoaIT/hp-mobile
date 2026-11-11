// Header xanh của /toi/huy-hieu (style Stitch "Huy hiệu & Xác minh", cùng kiểu MyGroupsHero): HeaderDecor; tràn mép + bo
// đáy trên điện thoại, khối bo xl từ 640px; H1 + dòng phụ render ở server, hộp tóm tắt số huy hiệu (BadgeSummary) đọc ở
// trình duyệt. Chữ on-primary trên primary ≥ 4,5:1.
import { getTranslations } from 'next-intl/server';
import { HeaderDecor } from '@/components/shared/header-decor';
import { BadgeSummary } from './badge-summary';

export async function BadgeHero() {
  const t = await getTranslations('common.badge_request');
  return (
    <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
      <HeaderDecor />
      <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-xl font-bold sm:text-2xl">{t('title')}</h1>
          <p className="text-sm text-on-primary/90 sm:text-md">{t('subtitle')}</p>
        </div>
        <BadgeSummary />
      </div>
    </div>
  );
}
