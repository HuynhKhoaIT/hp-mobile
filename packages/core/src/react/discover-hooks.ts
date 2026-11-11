// Hook tuần 9–10 phía người dùng: gợi ý Hub, tin khớp đồ thất lạc, dịch tin, huy hiệu, xoá tài khoản.
import type { Locale, RequestableBadge } from '@hp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type BadgeRequest, deleteMyAccount, listMyBadgeRequests, uploadVerificationDocument, type VerificationContentType } from '../badges';
import { requestBadge, type TranslatedContent, translateContent } from '../functions';
import { keys } from '../keys';
import { getHomeFeed, listLostFoundMatches, markListingReturned, type PublicListing } from '../listings';
import type { AppError } from '../result';
import { unwrap, useSession } from './hooks';
import { useSupabase } from './provider';

/** "Gợi ý cho bạn" ở Hub (khu trong hồ sơ khi không truyền site). */
export function useHomeFeed(opts: { site?: string | null; limit?: number; enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<PublicListing[], AppError>({
    queryKey: keys.homeFeed(opts.site),
    queryFn: () => unwrap(getHomeFeed(client, { site: opts.site, limit: opts.limit })),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });
}

/** Tin mất / nhặt khớp với tin của mình (chỉ chủ tin; khách → không gọi). */
export function useLostFoundMatches(listingId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<PublicListing[], AppError>({
    queryKey: keys.lostFoundMatches(listingId ?? ''),
    queryFn: () => unwrap(listLostFoundMatches(client, listingId ?? '')),
    enabled: !!listingId && !!userId && (opts.enabled ?? true),
    staleTime: 60_000,
  });
}

/** Dịch tin theo yêu cầu (bấm "Dịch"): mutation lưu kết quả vào cache theo (tin, ngôn ngữ) để mở lại không gọi lại. */
export function useTranslateListing(listingId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<TranslatedContent, AppError, Locale>({
    mutationFn: async (lang) => {
      const cached = qc.getQueryData<TranslatedContent>(keys.translation(listingId, lang));
      return cached ?? unwrap(translateContent(client, { listingId, lang }));
    },
    onSuccess: (data, lang) => qc.setQueryData(keys.translation(listingId, lang), data),
  });
}

/** Yêu cầu huy hiệu của mình. */
export function useMyBadgeRequests(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<BadgeRequest[], AppError>({
    queryKey: keys.myBadgeRequests(),
    queryFn: () => unwrap(listMyBadgeRequests(client)),
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 30_000,
  });
}

export type RequestBadgeVars = {
  badge: RequestableBadge;
  body: ArrayBuffer | Blob;
  contentType: VerificationContentType;
  size?: number;
};

/** Upload giấy tờ rồi gửi yêu cầu (request-badge). Lỗi: file_too_large, upload_failed, already_requested, badge_owned… */
export function useRequestBadge() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<string, AppError, RequestBadgeVars>({
    mutationFn: async (v) => {
      const path = await unwrap(uploadVerificationDocument(client, v));
      return unwrap(requestBadge(client, { badge: v.badge, documentPath: path }));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.myBadgeRequests() }),
  });
}

/** Xoá tài khoản. Thành công → client tự đăng xuất (signOut) và xoá cache. */
export function useDeleteAccount() {
  const client = useSupabase();
  return useMutation<null, AppError, void>({
    mutationFn: () => unwrap(deleteMyAccount(client)),
  });
}

/**
 * "Đã nhận lại đồ" (chủ tin lost / found) → làm mới chi tiết, danh sách, tin của tôi.
 * `deferRefresh`: thành công thì KHÔNG làm mới ngay — nơi gọi đang hiện bước "Bàn giao thành công" / đánh giá trong cùng
 * sheet (làm mới sớm khiến màn chi tiết gỡ sheet vì tin đã "trả lại"); gọi `refresh()` khi đóng sheet. Lỗi vẫn làm mới ngay.
 */
export function useMarkListingReturned(listingId: string, opts: { deferRefresh?: boolean } = {}) {
  const client = useSupabase();
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.listing(listingId) });
    void qc.invalidateQueries({ queryKey: keys.listings() });
    void qc.invalidateQueries({ queryKey: keys.myListings() });
    void qc.invalidateQueries({ queryKey: ['hp', 'listing', 'slug'] });
  };
  const mutation = useMutation<null, AppError, void>({
    mutationFn: () => unwrap(markListingReturned(client, listingId)),
    onSuccess: () => {
      if (!opts.deferRefresh) refresh();
    },
    onError: refresh,
  });
  return { ...mutation, refresh };
}
