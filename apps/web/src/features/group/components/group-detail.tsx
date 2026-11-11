// Chi tiết nhóm — style Stitch "Chi tiết chuyến xe & Đặt ghế", thứ tự khớp app (GroupDetail):
//   1 thẻ tóm tắt: ô icon dịch vụ + badge loại / trạng thái / cách tham gia (+ ngôn ngữ) → tiêu đề → chi phí lớn màu primary
//     ("/người" chữ nhỏ) → giờ / số chỗ / đội hình (kèo khai đội có sẵn — groupLineup, render ở server)
//   2 hành động (GroupActions: Tham gia dính đáy trên điện thoại; chủ nhóm: yêu cầu chờ duyệt…)
//   3 "Lộ trình" (điểm đi → điểm đến, timeline) / "Sân chơi" (tên + địa chỉ sân trong danh mục; không SĐT sân) — tiêu đề vạch
//   4 thành viên → 5 người tạo nhóm → 6 thông tin thêm (ô lưới) → 7 ghi chú → 8 mẹo an toàn riêng tính năng.
// ≥ 1024px: 2 cột — thông tin trái; hành động, người tạo, lời nhắc dính bên phải. Điện thoại: một cột đúng thứ tự trên
// (khối `contents` + `order` như chi tiết tin, không lặp DOM); chừa đáy cho thanh Tham gia dính.
// Khác Stitch (cố ý): không sơ đồ chọn ghế, chọn điểm đón, thanh toán QR, gọi điện / Zalo, bản đồ, quãng đường — không có
// tính năng / dữ liệu đó (chỗ tính theo số chỗ; lời nhắn gửi kèm yêu cầu tham gia).
// Trang công khai: không SĐT, không toạ độ (kể cả đã làm tròn — chưa có bản đồ), tên người tạo / thành viên đã rút gọn ở view.
// Nhóm đủ người / đã tới giờ / đã xong / đã huỷ: banner trạng thái (200, vẫn xem được); JSON-LD Event giữ, huỷ → EventCancelled.
// Phần tương tác (thành viên "sống", nút theo vai trò) là client island trong <ClientOnly> — HTML server có bản cache.
import type { PublicGroup } from '@hp/core';
import { GROUP_ATTRIBUTE_FIELDS, groupDisplayStatus, groupLineup, formatDate, formatNumber } from '@hp/shared';
import { ChevronLeft, CircleDot, Clock, Info, MapPin, UserCheck, Users } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { JsonLd } from '@/components/shared/json-ld';
import { BarHeading, SafetyTip } from '@/features/listing/components/safety-tip';
import { asLocale, type Translate } from '@/features/listing/display';
import { absoluteUrl } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import { profileAvatarUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { GROUP_STATUS_TONE, groupFeeText, groupStatusKey, groupTimeText, groupVenueText, toClientGroup } from '../display';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { groupJsonLd } from '../json-ld';
import { GroupActions } from './group-actions';
import { GroupMembers } from './group-members';

/** Thông tin thêm theo kind (GROUP_ATTRIBUTE_FIELDS): chỉ trường có giá trị; bool → Có / Không. */
type AttributeRow = { key: string; label: string; value: string };

function attributeRows(group: PublicGroup, t: Translate): AttributeRow[] {
  const attrs = (group.attributes && typeof group.attributes === 'object' && !Array.isArray(group.attributes)
    ? group.attributes
    : {}) as Record<string, unknown>;
  const fields: readonly (typeof GROUP_ATTRIBUTE_FIELDS)[keyof typeof GROUP_ATTRIBUTE_FIELDS][number][] = GROUP_ATTRIBUTE_FIELDS[group.kind];
  return fields.flatMap((field): AttributeRow[] => {
    const v = attrs[field.key];
    if (field.kind === 'bool' && typeof v === 'boolean') {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: t(`listing.attr_value.bool.${v ? 'yes' : 'no'}`) }];
    }
    if (field.kind === 'enum' && typeof v === 'string' && (field.options as readonly string[]).includes(v)) {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: t(`group.attr_value.${field.key}.${v}`) }];
    }
    if (field.kind === 'text' && typeof v === 'string' && v.trim()) {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: v.trim() }];
    }
    return [];
  });
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <dt className="flex min-w-0 flex-1 items-center gap-3 text-md text-muted">
        <span className="shrink-0 text-primary">{icon}</span>
        {label}
      </dt>
      <dd className="text-right text-md font-medium text-fg">{children}</dd>
    </div>
  );
}

export async function GroupDetail({ group, now }: { group: PublicGroup; now: number }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const cfg = GROUP_FEATURE_CONFIGS[group.kind];
  const status = groupDisplayStatus(group, new Date(now));
  const subKindName = t(`group.sub_kind.${group.sub_kind}`);
  const jsonLd = groupJsonLd(group, cfg.jsonLd, { url: absoluteUrl(`/nhom/${group.slug ?? ''}`, locale), subKindName });
  const attributes = attributeRows(group, t);
  const lineup = groupLineup(group.kind, group.attributes, group.seats_total, group.seats_taken);
  const clientGroup = toClientGroup(group);
  const iconClass = 'size-5';
  const hostAvatar = profileAvatarUrl(group.host_avatar_url);
  const hostName = group.host_name ?? '';
  const fee = groupFeeText(group, t, locale);
  const cut = Number(group.fee_per_person) > 0 ? fee.lastIndexOf('/') : -1;
  const statusNote =
    status === 'cancelled'
      ? t('group.detail.cancelled_note')
      : status === 'started'
        ? t('group.detail.started_note')
        : status !== 'open'
          ? t(`group.status.${status}`)
          : null;

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 max-lg:pb-32">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <nav>
        <Link
          href={cfg.path}
          className="inline-flex min-h-11 items-center gap-1 rounded-md text-md font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft strokeWidth={1.75} className="size-5" aria-hidden />
          {t('group.detail.back_to_list')}
        </Link>
      </nav>

      {statusNote ? (
        <div
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-md p-4 text-md text-fg',
            status === 'cancelled' ? 'bg-danger/10' : 'bg-surface-2',
          )}
        >
          <Info strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <p className="font-semibold">{statusNote}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Cột trái. Điện thoại: `contents` để các khối con xếp theo order xen với cột phải. */}
        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
          <header className="order-1 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-1">
              <span aria-hidden className={cn('flex size-8 items-center justify-center rounded-sm', cfg.tone.soft)}>
                <cfg.Icon strokeWidth={1.75} className={cn('size-5', cfg.tone.fg)} />
              </span>
              <Badge tone="primary">{subKindName}</Badge>
              <Badge tone={GROUP_STATUS_TONE[status]}>{t(`group.status.${groupStatusKey(group, status)}`)}</Badge>
              <Badge>{t(group.requires_approval ? 'group.card.needs_approval' : 'group.card.instant')}</Badge>
              {group.lang !== locale ? (
                <Badge tone="primary" lang={group.lang}>
                  {t(`common.locale.${group.lang}`)}
                </Badge>
              ) : null}
            </div>
            <h1 lang={group.lang} className="text-2xl font-semibold text-fg">
              {group.title}
            </h1>
            <p className="text-2xl font-bold text-primary">
              <span className="sr-only">{t('group.detail.fee')}: </span>
              {cut > 0 ? fee.slice(0, cut) : fee}
              {cut > 0 ? <span className="text-md font-semibold text-muted">{fee.slice(cut)}</span> : null}
            </p>
            <dl className="flex flex-col border-t border-border pt-1">
              <InfoRow icon={<Clock aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.time')}>
                <time dateTime={group.starts_at}>{groupTimeText(group, locale)}</time>
              </InfoRow>
              <InfoRow icon={<Users aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.seats')}>
                {t('group.detail.seats_value', { taken: group.seats_taken, total: group.seats_total })}
              </InfoRow>
              {lineup ? (
                <InfoRow icon={<UserCheck aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.lineup')}>
                  {lineup.need > 0
                    ? t('group.detail.lineup_value', { have: lineup.have, total: lineup.total, count: lineup.need })
                    : t('group.detail.lineup_full', { total: lineup.total })}
                </InfoRow>
              ) : null}
            </dl>
          </header>

          <section aria-labelledby="place-heading" className="order-3 flex flex-col gap-2">
            <BarHeading id="place-heading" tone="primary">
              {t(`group.detail.place_title_${group.kind}`)}
            </BarHeading>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
              {cfg.hasDestination && group.destination_text ? (
                <div className="flex gap-3">
                  <span aria-hidden className="flex flex-col items-center pt-1">
                    <CircleDot strokeWidth={1.75} className="size-5 text-primary" />
                    <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />
                    <MapPin strokeWidth={1.75} className="size-5 text-danger" />
                  </span>
                  <dl className="flex min-w-0 flex-1 flex-col gap-4">
                    <div>
                      <dt className="text-sm text-muted">{t('group.detail.from')}</dt>
                      <dd className="text-md font-semibold text-fg">{group.origin_text}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted">{t('group.detail.to')}</dt>
                      <dd className="text-md font-semibold text-fg">{group.destination_text}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <MapPin aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
                  <dl className="min-w-0 flex-1">
                    <dt className="text-sm text-muted">{cfg.hasDestination ? t('group.detail.from') : t('group.detail.venue')}</dt>
                    <dd className="text-md font-semibold text-fg">
                      {cfg.hasDestination ? group.origin_text : groupVenueText(group)}
                      {!cfg.hasDestination && group.venue_id && group.venue_address?.trim() ? (
                        <span className="block text-sm font-normal text-muted">{group.venue_address}</span>
                      ) : null}
                    </dd>
                  </dl>
                </div>
              )}
              {group.site_name ? <p className="border-t border-border pt-2 text-sm text-muted">{group.site_name}</p> : null}
            </div>
          </section>

          <div className="order-4">
            <GroupMembers group={clientGroup} />
          </div>

          {attributes.length > 0 ? (
            <section aria-labelledby="attributes-heading" className="order-6 flex flex-col gap-2">
              <BarHeading id="attributes-heading" tone="primary">
                {t('group.detail.attributes')}
              </BarHeading>
              <dl className="grid gap-2 sm:grid-cols-2">
                {attributes.map((a) => (
                  <div key={a.key} className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-3 shadow-card">
                    <dt className="text-sm text-muted">{a.label}</dt>
                    <dd lang={a.key === 'vehicle_note' ? group.lang : undefined} className="text-md font-semibold text-fg">
                      {a.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section aria-labelledby="description-heading" className="order-7 flex flex-col gap-2">
            <BarHeading id="description-heading" tone="primary">
              {t('group.detail.description')}
            </BarHeading>
            {group.description?.trim() ? (
              <p
                lang={group.lang}
                className="rounded-lg border border-border bg-surface p-4 text-md whitespace-pre-line text-fg shadow-card"
              >
                {group.description}
              </p>
            ) : (
              <p className="rounded-lg border border-border bg-surface p-4 text-md text-muted shadow-card">
                {t('group.detail.no_description')}
              </p>
            )}
          </section>
        </div>

        {/* Cột phải (desktop, dính khi cuộn). */}
        <div className="contents lg:sticky lg:top-20 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <div className="order-2">
            <GroupActions group={clientGroup} />
          </div>

          <section aria-labelledby="host-heading" className="order-5 flex flex-col gap-2">
            <BarHeading id="host-heading" tone="primary">
              {t('group.detail.host')}
            </BarHeading>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-primary-light">
                  {hostAvatar ? (
                    <Image src={hostAvatar} alt="" fill unoptimized sizes="48px" className="object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-full items-center justify-center text-lg font-semibold text-primary">
                      {hostName.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-md font-semibold text-fg">{hostName}</p>
                  <p className="text-sm text-muted">
                    {t('listing.detail.member_since', { date: formatDate(group.host_since, locale) })}
                  </p>
                  <p className="text-sm text-muted">
                    {group.host_rating_count > 0
                      ? t('listing.detail.rating', {
                          avg: formatNumber(Math.round(group.host_rating_avg * 10) / 10, locale),
                          count: group.host_rating_count,
                        })
                      : t('listing.detail.no_rating')}
                  </p>
                </div>
              </div>
              {group.host_badges.some((b) => t.has(`listing.owner_badge.${b}`)) ? (
                <ul className="flex flex-wrap gap-1">
                  {group.host_badges
                    .filter((b) => t.has(`listing.owner_badge.${b}`))
                    .map((b) => (
                      <li key={b}>
                        <Badge tone="success">{t(`listing.owner_badge.${b}`)}</Badge>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          </section>

          <SafetyTip className="order-8" title={t('listing.tip.title')} text={t(`group.detail.tip_${group.kind}`)} />
        </div>
      </div>
    </article>
  );
}
