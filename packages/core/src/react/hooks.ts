// Hook TanStack Query dùng chung app và web (client). Client lấy qua useSupabase(); key chỉ từ keys.ts.
// queryFn ném AppError (unwrap) để TanStack đánh dấu lỗi; component đọc `error.code` rồi t('errors.' + code).
import type { Session } from '@supabase/supabase-js';
import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { keys } from '../keys';
import {
  getListing,
  getListingBySlug,
  type ListingQuery,
  type PublicListing,
  recordListingView,
  searchListings,
  similarListings,
} from '../listings';
import { completeOnboarding, getMyProfile, type MyProfile, updateMyProfile, uploadAvatar } from '../profile';
import type { AppError, Result } from '../result';
import { listSites, type Page, type Site } from '../social';
import { useSupabase } from './provider';

/** Result → data, hoặc ném AppError cho TanStack. */
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise;
  if (result.error) throw result.error;
  return result.data;
}

export type SessionState = { session: Session | null; userId: string | null; isLoading: boolean };

/** Phiên đăng nhập hiện tại, cập nhật theo onAuthStateChange (đăng nhập, đăng xuất, làm mới token). */
export function useSession(): SessionState {
  const client = useSupabase();
  const [state, setState] = useState<{ session: Session | null; isLoading: boolean }>({ session: null, isLoading: true });

  useEffect(() => {
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, isLoading: false });
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, isLoading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  return { ...state, userId: state.session?.user.id ?? null };
}

/** Hồ sơ của chính mình (null khi chưa đăng nhập). */
export function useMyProfile() {
  const client = useSupabase();
  const { userId, isLoading: sessionLoading } = useSession();
  const query = useQuery<MyProfile, AppError>({
    queryKey: keys.me(userId ?? undefined),
    queryFn: () => unwrap(getMyProfile(client)),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { ...query, userId, isLoading: sessionLoading || (!!userId && query.isLoading) };
}

/** Danh mục địa điểm làm việc (admin quản lý; đổi hiếm → cache 1 giờ). */
export function useSites() {
  const client = useSupabase();
  return useQuery<Site[], AppError>({
    queryKey: keys.sites(),
    queryFn: () => unwrap(listSites(client)),
    staleTime: 60 * 60_000,
  });
}

/** Bước cuối onboarding: tên, ngôn ngữ, khu, quan tâm + đồng ý điều khoản. */
export function useCompleteOnboarding() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<MyProfile, AppError, unknown>({
    mutationFn: (input) => unwrap(completeOnboarding(client, input)),
    onSuccess: (profile) => {
      qc.setQueryData(keys.me(profile.id), profile);
    },
  });
}

/** Sửa hồ sơ (Cài đặt, đổi ngôn ngữ). */
export function useUpdateProfile() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<MyProfile, AppError, unknown>({
    mutationFn: (input) => unwrap(updateMyProfile(client, input)),
    onSuccess: (profile) => {
      qc.setQueryData(keys.me(profile.id), profile);
      void qc.invalidateQueries({ queryKey: keys.profile(profile.id) });
    },
  });
}

/** Đổi ảnh đại diện: body đã nén sẵn (app: expo-image-manipulator, web: canvas) → upload → ghi avatar_url. */
export function useUploadAvatar() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<MyProfile, AppError, { userId: string; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' }>({
    mutationFn: (input) => unwrap(uploadAvatar(client, input)),
    onSuccess: (profile) => {
      qc.setQueryData(keys.me(profile.id), profile);
      void qc.invalidateQueries({ queryKey: keys.profile(profile.id) });
    },
  });
}

// ── Tin đăng (đọc) ──────────────────────────────────────────────────────────────

/** Danh sách tin vô hạn (cursor). Key theo bộ lọc; staleTime 60 s (.claude/rules/mobile-performance.md). */
export function useListingList(query: Omit<ListingQuery, 'cursor'> = {}, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const result = useInfiniteQuery<Page<PublicListing>, AppError, InfiniteData<Page<PublicListing>>, readonly unknown[], string | null>({
    queryKey: keys.listings(query),
    queryFn: ({ pageParam }) => unwrap(searchListings(client, { ...query, cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
    enabled: opts.enabled ?? true,
  });
  const items = result.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...result, items };
}

/** Chi tiết theo id (điều hướng nội bộ). Lấy sẵn từ cache danh sách để mở màn không chớp skeleton. */
export function useListing(id: string | undefined) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useQuery<PublicListing, AppError>({
    queryKey: keys.listing(id ?? ''),
    queryFn: () => unwrap(getListing(client, id ?? '')),
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: () => (id ? findCachedListing(qc, id) : undefined),
  });
}

/** Chi tiết theo slug (link chia sẻ / Universal Link). */
export function useListingBySlug(slug: string | undefined) {
  const client = useSupabase();
  return useQuery<PublicListing, AppError>({
    queryKey: keys.listingBySlug(slug ?? ''),
    queryFn: () => unwrap(getListingBySlug(client, slug ?? '')),
    enabled: !!slug,
    staleTime: 30_000,
  });
}

export function useSimilarListings(id: string | undefined, limit = 6) {
  const client = useSupabase();
  return useQuery<PublicListing[], AppError>({
    queryKey: keys.similarListings(id ?? ''),
    queryFn: () => unwrap(similarListings(client, id ?? '', limit)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Đếm lượt xem một lần khi mở chi tiết (chỉ khi đăng nhập; lỗi bỏ qua). */
export function useRecordListingView(id: string | undefined) {
  const client = useSupabase();
  useEffect(() => {
    if (id) void recordListingView(client, id);
  }, [client, id]);
}

function findCachedListing(qc: ReturnType<typeof useQueryClient>, id: string): PublicListing | undefined {
  for (const [, data] of qc.getQueriesData<InfiniteData<Page<PublicListing>>>({ queryKey: keys.listings() })) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find((l) => l.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}
