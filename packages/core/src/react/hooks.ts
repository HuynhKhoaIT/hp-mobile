// Hook TanStack Query dùng chung app và web (client). Client lấy qua useSupabase(); key chỉ từ keys.ts.
// queryFn ném AppError (unwrap) để TanStack đánh dấu lỗi; component đọc `error.code` rồi t('errors.' + code).
import type { Session } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { keys } from '../keys';
import { completeOnboarding, getMyProfile, type MyProfile, updateMyProfile } from '../profile';
import type { AppError, Result } from '../result';
import { listSites, type Site } from '../social';
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
