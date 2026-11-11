// Chi tiết tin — thứ tự khớp app: gallery → tiêu đề, giá, badge, thời gian + lượt xem → lời nhắc an toàn → thông số
// (readAttributes) → mô tả → khu vực (gần đúng ~300 m) → người đăng → Nhắn tin / Chia sẻ → tin tương tự.
// ≥ 1024px: 2 cột — gallery + thông số trái; tiêu đề, giá, người đăng, nút dính bên phải. Điện thoại: một cột đúng thứ tự trên
// (khối phải dùng `contents` + `order` để xen giữa các khối trái mà không lặp DOM).
// Trang công khai: không SĐT (chỉ lộ sau "Hiện số" ở client), không toạ độ, không địa chỉ chi tiết; tên người đăng đã rút gọn ở view.
// Tin đã bán / đóng / hết hạn (≤ 30 ngày — sau đó page chuyển sang 410): banner state.* + ẩn liên hệ, không JSON-LD
// (Google yêu cầu gỡ JobPosting / Offer khi hết hiệu lực), vẫn có tin tương tự.
// Tin khác ngôn ngữ trang: nút "Dịch" (client island TranslateBar) — HTML server giữ bản gốc, bản dịch chỉ thay ở trình duyệt.
// Đồ thất lạc (config.returnable): nhãn "Đã trả lại" (server) + khối chủ tin "Tin có thể khớp" / "Đã nhận lại đồ" (client).
// Style Stitch "Chi tiết tin Pass / phòng trọ / tin rơi đồ" (khớp app, biến thể theo config tính năng): ảnh tràn mép trên điện
// thoại + hàng ảnh nhỏ → thẻ tóm tắt (badge danh mục theo config.card.categoryBadge — "Mất đồ" đỏ / "Nhặt được" xanh; tiêu đề;
// giá lớn màu primary, đơn vị chữ nhỏ; nhãn thông số nổi bật config.card.facts; khu gần đúng; đăng lúc · lượt xem) → mẹo an
// toàn riêng (config.tipKey) → lưới ô thông tin → người đăng → liên hệ (nút chính theo config.primaryCta; dưới 1024px là thanh
// dính đáy) → mô tả → tin tương tự. Khác Stitch (cố ý): không trả giá, Zalo, hẹn xem, giá gốc gạch, bảng khoảng cách tới từng
// nhà máy, bản đồ — không có tính năng / dữ liệu đó.
// Stitch "Chi tiết phòng trọ" / "Chi tiết việc làm" (khớp ListingDetail của app): nhãn phủ trên ảnh — tình trạng (đang hiện:
// listing.availability "Còn trống" / "Đang tuyển"…; đã bán / đóng / hết hạn: common.status; đồ đã nhận lại: "Đã trả lại") +
// "Đã xác minh" (người đăng có huy hiệu); trọ: giá phủ góc dưới ảnh trên nền surface/90 (không có token scrim / gradient tối
// nên dùng nền đặc); "Mã tin #A1B2C3 · Đăng …" trên tiêu đề; "Hết hạn {ngày} · lượt xem" cuối thẻ; thông số chia khối có tiêu
// đề (AttributeSections — trọ Chi phí / Nội quy, việc Người phụ trách / Yêu cầu); thanh liên hệ [Gọi] [Nhắn tin] [nút chính].
import { listingDisplayStatus, type PublicListing } from '@hp/core';
import { featureOfCategory, formatDate, formatDistance, formatRelative, priceLabel, readAttributes } from '@hp/shared';
import { ChevronLeft, Info, MapPin } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/shared/badge';
import { JsonLd } from '@/components/shared/json-ld';
import { absoluteUrl } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import { attributeText, asLocale, cardFacts, isReturned, priceText } from '../display';
import { configOfCategory } from '../features';
import { listingJsonLd } from '../json-ld';
import { getSimilarListings } from '../queries';
import { AttributeSections, HIDDEN_ATTRIBUTES } from './attribute-grid';
import { BookmarkButton } from './bookmark-button';
import { ListingActions } from './listing-actions';
import { ListingGallery } from './listing-gallery';
import { ListingGrid } from './listing-grid';
import { ListingPlaceholder } from './listing-placeholder';
import { TranslatableText, TranslateBar, TranslationProvider } from './listing-translation';
import { LostFoundOwnerPanel } from './lost-found-owner-panel';
import { PosterCard } from './poster-card';
import { BarHeading, SafetyTip } from './safety-tip';

export async function ListingDetail({ listing, now }: { listing: PublicListing; now: number }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const cfg = configOfCategory(listing.category);
  const attributes = readAttributes(listing.category, listing.attributes).filter((r) => !HIDDEN_ATTRIBUTES.has(r.field.key));
  const similar = await getSimilarListings(listing.id);
  const categoryName = t(`common.category.${listing.category}`);
  const price = priceText(priceLabel(listing), t, locale);
  const displayStatus = listingDisplayStatus(listing);
  const active = displayStatus === 'active';
  const returned = !!cfg.returnable && isReturned(listing);
  const foreign = listing.lang !== locale;
  const badge = cfg.card?.categoryBadge?.[listing.category];
  const facts = cardFacts(listing, cfg.card?.facts, t, locale);
  const cut = price.lastIndexOf('/');
  const feature = featureOfCategory(listing.category);
  // Nhãn tình trạng trên ảnh: chữ + tone (không chỉ màu). Đồ thất lạc đang hiện theo category (Đang tìm / Chờ chủ nhận).
  const status = returned
    ? { label: t('listing.lost_found.returned_badge'), tone: 'success' as const }
    : active
      ? { label: t(`listing.availability.${feature === 'lostFound' ? listing.category : feature}`), tone: 'success' as const }
      : { label: t(`common.status.${displayStatus}`), tone: 'danger' as const };
  // Cùng quy tắc với PosterCard: có huy hiệu (đã dịch được) = đã xác minh.
  const verified = listing.owner_badges.some((b) => t.has(`listing.owner_badge.${b}`));
  const jsonLd = active
    ? listingJsonLd(listing, cfg.jsonLd, { url: absoluteUrl(`/tin/${listing.slug}`, locale), categoryName })
    : null;

  return (
    <TranslationProvider listingId={listing.id}>
      <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 max-lg:pb-28">
        {jsonLd ? <JsonLd data={jsonLd} /> : null}
        <nav>
          <Link
            href={cfg.path}
            className="inline-flex min-h-11 items-center gap-1 rounded-md text-md font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronLeft strokeWidth={1.75} className="size-5" aria-hidden />
            {t('listing.detail.back_to_list')}
          </Link>
        </nav>

        {!active ? (
          <div role="status" className="flex items-start gap-3 rounded-md bg-surface-2 p-4 text-md text-fg">
            <Info strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{t(`listing.state.${displayStatus}`)}</p>
              <p className="text-muted">{t('listing.state.inactive_hint')}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="order-1 lg:col-span-7 lg:row-start-1">
            <ListingGallery
              images={listing.images}
              title={listing.title}
              placeholder={<ListingPlaceholder category={listing.category} size="lg" />}
              overlayTop={
                <>
                  <Badge overlay tone={status.tone}>
                    {status.label}
                  </Badge>
                  {verified ? (
                    <Badge overlay tone="primary">
                      {t('common.profile.verified')}
                    </Badge>
                  ) : null}
                </>
              }
              overlayBottom={
                feature === 'room' && price ? (
                  <p className="inline-flex rounded-md bg-surface/90 px-3 py-1.5 text-md font-bold text-primary shadow-card backdrop-blur-sm">
                    {price}
                  </p>
                ) : undefined
              }
            />
          </div>

          {/* Cột phải (desktop, dính khi cuộn). Điện thoại: `contents` để các khối con xếp theo order giữa cột trái. */}
          <div className="contents lg:sticky lg:top-20 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
            <header className="order-2 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-wrap gap-1">
                <Badge tone={badge?.tone}>{badge?.labelKey ? t(badge.labelKey) : categoryName}</Badge>
                {foreign ? (
                  <Badge tone="primary" lang={listing.lang}>
                    {t(`common.locale.${listing.lang}`)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted">
                {listing.short_id ? (
                  <>
                    {t('listing.detail.code', { code: listing.short_id.toUpperCase() })}
                    {' · '}
                  </>
                ) : null}
                <time dateTime={listing.created_at}>
                  {t('listing.detail.posted_at', { time: formatRelative(listing.created_at, locale, new Date(now)) })}
                </time>
              </p>
              <div className="flex items-start gap-3">
                <TranslatableText
                  as="h1"
                  field="title"
                  original={listing.title}
                  lang={listing.lang}
                  className="flex-1 text-2xl font-semibold text-fg"
                />
                <BookmarkButton listingId={listing.id} />
              </div>
              {price ? (
                <p className="text-2xl font-bold text-primary">
                  {cut > 0 ? price.slice(0, cut) : price}
                  {cut > 0 ? (
                    <>
                      <wbr />
                      <span className="text-md font-semibold text-muted">{price.slice(cut)}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
              {facts.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {facts.map((f) => (
                    <li key={f} className="rounded-sm bg-primary-light px-2.5 py-1 text-sm font-semibold text-primary">
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                {listing.site_name ? (
                  <>
                    <p className="flex items-start gap-1.5 text-md font-medium text-fg">
                      <MapPin strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <span className="sr-only">{t('listing.detail.location')}: </span>
                      {listing.distance_to_site_m !== null
                        ? t('listing.card.distance_to_site', {
                            site: listing.site_name,
                            distance: formatDistance(listing.distance_to_site_m, locale),
                          })
                        : listing.site_name}
                    </p>
                    <p className="text-sm text-muted">{t('listing.detail.approx_location')}</p>
                  </>
                ) : null}
                <p className="text-sm text-muted">
                  {active && listing.expires_at ? (
                    <>
                      <time dateTime={listing.expires_at}>
                        {t('listing.detail.expires_at', { date: formatDate(listing.expires_at, locale) })}
                      </time>
                      {' · '}
                    </>
                  ) : null}
                  {t('listing.detail.views', { count: listing.view_count })}
                </p>
              </div>
              {foreign ? <TranslateBar /> : null}
            </header>

            <SafetyTip className="order-3" title={t('listing.tip.title')} text={t(cfg.tipKey ?? 'listing.detail.safety_tip')} />

            <div className="order-5">
              <PosterCard listing={listing} locale={locale} />
            </div>
            <div className="order-6">
              <ListingActions
                listingId={listing.id}
                slug={listing.slug}
                title={listing.title}
                ownerId={listing.owner_id}
                category={listing.category}
                active={active}
                primaryCta={cfg.primaryCta}
              />
            </div>
          </div>

          <div className="contents lg:col-span-7 lg:row-start-2 lg:flex lg:flex-col lg:gap-6">
            {attributes.length > 0 ? (
              <div className="order-4 flex flex-col gap-6">
                <AttributeSections
                  category={listing.category}
                  rows={attributes}
                  title={t('listing.detail.attributes')}
                  groupTitle={(key) => t(`listing.attr_group.${key}`)}
                  label={(key) => t(`listing.attr.${key}`)}
                  valueText={(field, value) => attributeText(field, value, t, locale)}
                  lang={listing.lang}
                />
              </div>
            ) : null}

            <section aria-labelledby="description-heading" className="order-7 flex flex-col gap-2">
              <BarHeading id="description-heading" tone="primary">
                {t('listing.detail.description')}
              </BarHeading>
              {listing.description?.trim() ? (
                <TranslatableText
                  as="p"
                  field="description"
                  original={listing.description}
                  lang={listing.lang}
                  className="rounded-lg border border-border bg-surface p-4 text-md whitespace-pre-line text-fg shadow-card"
                />
              ) : (
                <p className="rounded-lg border border-border bg-surface p-4 text-md text-muted shadow-card">
                  {t('listing.detail.no_description')}
                </p>
              )}
            </section>

          </div>
        </div>

        {cfg.returnable ? (
          <LostFoundOwnerPanel
            listingId={listing.id}
            ownerId={listing.owner_id}
            item={{ title: listing.title, category: listing.category, images: listing.images, attributes: listing.attributes }}
            active={active}
            returned={returned}
          />
        ) : null}

        {similar.length > 0 ? (
          <section aria-labelledby="similar-heading" className="flex flex-col gap-3 pt-4">
            <BarHeading id="similar-heading">{t('listing.detail.similar')}</BarHeading>
            <ListingGrid items={similar} now={now} layout={cfg.cardLayout} />
          </section>
        ) : null}
      </article>
    </TranslationProvider>
  );
}
