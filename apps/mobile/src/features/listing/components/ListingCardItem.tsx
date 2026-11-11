// Thẻ tin của engine Listing (danh sách, hàng ngang): ListingCard của @/ui + nút tim lưu tin khi config bật
// `card.display.bookmark`. Hook lưu tin (useListingBookmark — khách → đăng nhập, lạc quan + rollback, haptic, toast) chỉ chạy
// ở thẻ có nút; tin của chính mình không có nút (giống thanh đầu trang chi tiết).
import { ListingCard, type ListingCardProps } from '@/ui';
import { useIsOwner, useListingBookmark } from '../hooks';

export type ListingCardItemProps = Omit<ListingCardProps, 'bookmark'>;

export function ListingCardItem(props: ListingCardItemProps) {
  if (!props.display?.bookmark) return <ListingCard {...props} />;
  return <BookmarkableCard {...props} />;
}

function BookmarkableCard(props: ListingCardItemProps) {
  const isOwner = useIsOwner(props.listing);
  const bookmark = useListingBookmark(props.listing.id);
  return <ListingCard {...props} bookmark={isOwner ? undefined : bookmark} />;
}
