// Nút trên Header màn chi tiết tin: Lưu tin (trái tim, khách → đăng nhập) + Chia sẻ (URL web tenapp.vn).
// Chủ tin không thấy nút lưu (tin của chính mình).
import type { PublicListing } from '@hp/core';
import { Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BookmarkButton, IconButton } from '@/ui';
import { useIsOwner, useListingBookmark, useShareListing } from '../hooks';

export function ListingHeaderActions({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation('listing');
  const share = useShareListing();
  const isOwner = useIsOwner(listing);
  const bookmark = useListingBookmark(listing.id);
  return (
    <>
      {isOwner ? null : <BookmarkButton saved={bookmark.saved} onToggle={bookmark.onToggle} labels={bookmark.labels} />}
      <IconButton icon={Share2} accessibilityLabel={t('detail.share')} onPress={() => share(listing)} />
    </>
  );
}
