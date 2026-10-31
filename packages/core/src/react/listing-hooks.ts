// Hook ghi tin + tin của tôi + lưu tin (tuần 4). Optimistic + rollback cho: đánh dấu đã bán / đóng, xoá tin, lưu tin
// (.claude/rules/be-shared-packages.md, skill /optimistic-mutation). Invalidate đúng key trong keys.ts.
import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../keys';
import { listSavedListings, type PublicListing } from '../listings';
import {
  createListing,
  deleteListing,
  getMyListing,
  listMyListings,
  type MyListing,
  type MyListingsTab,
  renewListing,
  revealContact,
  type SavedListingResult,
  setListingStatus,
  updateListing,
  uploadListingImage,
} from '../listings-write';
import type { AppError } from '../result';
import { listBookmarks, type Page, setBookmark } from '../social';
import type { OwnerListingStatus } from '@hp/shared';
import { unwrap } from './hooks';
import { useSupabase } from './provider';

type MyPages = InfiniteData<Page<MyListing>, string | null>;

/** Tin đổi → làm mới danh sách công khai, chi tiết và "Tin của tôi". */
function invalidateListing(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: keys.listings() });
  void qc.invalidateQueries({ queryKey: keys.myListings() });
  if (id) {
    void qc.invalidateQueries({ queryKey: keys.listing(id) });
    void qc.invalidateQueries({ queryKey: keys.myListing(id) });
  }
  void qc.invalidateQueries({ queryKey: ['hp', 'listing', 'slug'] });
}

// ── Tin của tôi ────────────────────────────────────────────────────────────────────
export function useMyListings(tab: MyListingsTab, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const result = useInfiniteQuery<Page<MyListing>, AppError, MyPages, readonly unknown[], string | null>({
    queryKey: keys.myListings(tab),
    queryFn: ({ pageParam }) => unwrap(listMyListings(client, { tab, cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
    enabled: opts.enabled ?? true,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

export function useMyListing(id: string | undefined) {
  const client = useSupabase();
  return useQuery<MyListing, AppError>({
    queryKey: keys.myListing(id ?? ''),
    queryFn: () => unwrap(getMyListing(client, id ?? '')),
    enabled: !!id,
    staleTime: 0,
  });
}

// ── Đăng / sửa ─────────────────────────────────────────────────────────────────────
/** Đăng tin. Kết quả có `status` thật sau kiểm duyệt (active / pending_review / rejected / draft). */
export function useCreateListing() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedListingResult, AppError, unknown>({
    mutationFn: (input) => unwrap(createListing(client, input)),
    onSuccess: (saved) => invalidateListing(qc, saved.id),
  });
}

export function useUpdateListing() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedListingResult, AppError, unknown>({
    mutationFn: (input) => unwrap(updateListing(client, input)),
    onSuccess: (saved) => invalidateListing(qc, saved.id),
  });
}

/** Upload một ảnh (đã nén). Trả path; app / web tự lặp + thử lại từng ảnh lỗi. */
export function useUploadListingImage() {
  const client = useSupabase();
  return useMutation<
    string,
    AppError,
    { userId: string; listingId: string; index: number; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' }
  >({
    mutationFn: (input) => unwrap(uploadListingImage(client, input)),
    retry: 2,
  });
}

// ── Trạng thái (optimistic) ────────────────────────────────────────────────────────
/** Snapshot mọi trang "Tin của tôi" để rollback. */
function snapshotMine(qc: QueryClient) {
  return qc.getQueriesData<MyPages>({ queryKey: keys.myListings() });
}
function restoreMine(qc: QueryClient, snapshot: ReturnType<typeof snapshotMine>) {
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}
function patchMine(qc: QueryClient, id: string, patch: (l: MyListing) => MyListing | null) {
  qc.setQueriesData<MyPages>({ queryKey: keys.myListings() }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.flatMap((l) => (l.id === id ? (patch(l) ?? []) : [l])),
          })),
        }
      : data,
  );
}

/** Đánh dấu đã bán / đóng / mở lại — đổi ngay trên màn, lỗi thì trả lại như cũ. */
export function useSetListingStatus() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedListingResult, AppError, { id: string; status: OwnerListingStatus }, { snapshot: ReturnType<typeof snapshotMine> }>({
    mutationFn: (v) => unwrap(setListingStatus(client, v)),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.myListings() });
      const snapshot = snapshotMine(qc);
      patchMine(qc, v.id, (l) => ({ ...l, status: v.status }));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx && restoreMine(qc, ctx.snapshot),
    onSettled: (_d, _e, v) => invalidateListing(qc, v.id),
  });
}

/** Xoá mềm — bỏ khỏi danh sách ngay, lỗi thì hiện lại. */
export function useDeleteListing() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, string, { snapshot: ReturnType<typeof snapshotMine> }>({
    mutationFn: (id) => unwrap(deleteListing(client, id)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.myListings() });
      const snapshot = snapshotMine(qc);
      patchMine(qc, id, () => null);
      return { snapshot };
    },
    onError: (_e, _id, ctx) => ctx && restoreMine(qc, ctx.snapshot),
    onSettled: (_d, _e, id) => invalidateListing(qc, id),
  });
}

/** Gia hạn — trả expires_at mới (lỗi too_early khi còn > 3 ngày). */
export function useRenewListing() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<string, AppError, string>({
    mutationFn: (id) => unwrap(renewListing(client, id)),
    onSuccess: (_expires, id) => invalidateListing(qc, id),
  });
}

/** Hiện SĐT người đăng (mỗi lần bấm là một lượt, giới hạn 20 / giờ). */
export function useRevealContact() {
  const client = useSupabase();
  return useMutation<{ phone: string | null }, AppError, string>({
    mutationFn: (listingId) => unwrap(revealContact(client, listingId)),
  });
}

// ── Lưu tin ────────────────────────────────────────────────────────────────────────
/** id các tin đã lưu (để tô trái tim). Rỗng khi chưa đăng nhập. */
export function useBookmarkedListingIds(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<Set<string>, AppError>({
    queryKey: keys.bookmarks('listing'),
    queryFn: async () => new Set((await unwrap(listBookmarks(client, 'listing'))).map((b) => b.target_id)),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });
}

/** Lưu / bỏ lưu — tô trái tim ngay, lỗi thì trả lại. `next = true` là lưu. */
export function useToggleBookmark() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, { listingId: string; next: boolean }, { previous: Set<string> | undefined }>({
    mutationFn: (v) => unwrap(setBookmark(client, { targetType: 'listing', targetId: v.listingId, next: v.next })),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.bookmarks('listing') });
      const previous = qc.getQueryData<Set<string>>(keys.bookmarks('listing'));
      const nextSet = new Set(previous ?? []);
      if (v.next) nextSet.add(v.listingId);
      else nextSet.delete(v.listingId);
      qc.setQueryData(keys.bookmarks('listing'), nextSet);
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.bookmarks('listing'), ctx?.previous),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.bookmarks('listing') });
      void qc.invalidateQueries({ queryKey: keys.savedListings() });
    },
  });
}

/** Danh sách tin đã lưu (màn "Tin đã lưu"). */
export function useSavedListings(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<PublicListing[], AppError>({
    queryKey: keys.savedListings(),
    queryFn: () => unwrap(listSavedListings(client)),
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
  });
}
