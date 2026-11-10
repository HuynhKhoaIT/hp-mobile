// Nút trên Header màn chi tiết tin: Lưu tin (trái tim, khách → đăng nhập) + Chia sẻ (URL web tenapp.vn) + Báo cáo.
// Chủ tin không thấy nút lưu / báo cáo (tin của chính mình).
import type { PublicListing } from '@hp/core';
import { Flag, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useReportAction } from '@/core/report';
import { BookmarkButton, IconButton, ReportSheet } from '@/ui';
import { useIsOwner, useListingBookmark, useShareListing } from '../hooks';

export function ListingHeaderActions({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation('listing');
  const share = useShareListing();
  const isOwner = useIsOwner(listing);
  const bookmark = useListingBookmark(listing.id);
  const report = useReportAction({ type: 'listing', id: listing.id });
  return (
    <>
      {isOwner ? null : <BookmarkButton saved={bookmark.saved} onToggle={bookmark.onToggle} labels={bookmark.labels} />}
      <IconButton icon={Share2} accessibilityLabel={t('detail.share')} onPress={() => share(listing)} />
      {isOwner ? null : (
        <>
          <IconButton icon={Flag} accessibilityLabel={t('common:actions.report')} onPress={report.open} />
          <ReportSheet {...report.sheetProps} />
        </>
      )}
    </>
  );
}
