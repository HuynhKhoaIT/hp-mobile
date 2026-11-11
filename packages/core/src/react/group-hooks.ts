// Hook nhóm ghép (tuần 7). Optimistic + rollback cho tham gia / rời nhóm / duyệt (.claude/rules/be-shared-packages.md):
// chỗ trống, hàng avatar và trạng thái của mình đổi ngay; lỗi → trả lại + client hiện t('errors.<code>').
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  type GroupMemberPreview,
  groupMembersPreview,
  type MemberStatus,
  type RateGroupInput,
  type UpdateGroupInput,
} from '@hp/shared';
import type { Json } from '@hp/db';
import { joinGroup, respondJoin } from '../functions';
import {
  cancelGroup,
  createGroup,
  getGroup,
  getGroupBySlug,
  getMyGroupRating,
  getMyMembership,
  type GroupMember,
  type GroupPage,
  type GroupQuery,
  leaveGroup,
  listGroupsByHost,
  listMyGroups,
  type MyGroupPage,
  type MyGroupsTab,
  rateGroup,
  listGroupMembers,
  type PublicGroup,
  type SavedGroup,
  searchGroups,
  subscribeToGroup,
  updateGroup,
} from '../groups';
import { keys } from '../keys';
import type { AppError } from '../result';
import { unwrap, useSession } from './hooks';
import { useSupabase } from './provider';

type GroupPages = InfiniteData<GroupPage, string | null>;

/** Nhóm đổi → làm mới danh sách, chi tiết (cả thành viên + trạng thái của mình), slug, nhóm của tôi. */
function invalidateGroup(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: keys.groups() });
  void qc.invalidateQueries({ queryKey: keys.myGroups() });
  // tham gia / rời / được duyệt → vào / ra chat nhóm
  void qc.invalidateQueries({ queryKey: keys.conversations() });
  if (id) void qc.invalidateQueries({ queryKey: keys.group(id) });
  void qc.invalidateQueries({ queryKey: ['hp', 'group', 'slug'] });
}

/** Tìm nhóm trong cache danh sách để mở chi tiết không chớp skeleton. */
function findCachedGroup(qc: QueryClient, id: string): PublicGroup | undefined {
  for (const [, data] of qc.getQueriesData<GroupPages>({ queryKey: keys.groups() })) {
    const hit = data?.pages.flatMap((p) => p.items).find((g) => g.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Sửa nhóm trong mọi cache (chi tiết + các trang danh sách). */
function patchGroupCaches(qc: QueryClient, id: string, patch: (g: PublicGroup) => PublicGroup) {
  qc.setQueryData<PublicGroup>(keys.group(id), (g) => (g ? patch(g) : g));
  qc.setQueriesData<GroupPages>({ queryKey: keys.groups() }, (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((g) => (g.id === id ? patch(g) : g)) })) }
      : data,
  );
}

/** Đổi số người đã nhận + hàng avatar (members ≤ 8). */
function withSeats(g: PublicGroup, delta: number, member?: GroupMemberPreview, removeId?: string): PublicGroup {
  const taken = Math.max(0, Math.min(g.seats_total, g.seats_taken + delta));
  let members = groupMembersPreview(g.members);
  if (member && !members.some((m) => m.id === member.id)) members = [...members, member].slice(0, 8);
  if (removeId) members = members.filter((m) => m.id !== removeId);
  return {
    ...g,
    seats_taken: taken,
    seats_left: g.seats_total - taken,
    status: g.status === 'open' || g.status === 'full' ? (taken >= g.seats_total ? 'full' : 'open') : g.status,
    members: members as unknown as Json,
  };
}

type Snapshot = { group?: PublicGroup; lists: [readonly unknown[], GroupPages | undefined][]; membership?: MemberStatus | null };

async function snapshot(qc: QueryClient, id: string, membershipKey?: readonly unknown[]): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: keys.group(id) });
  await qc.cancelQueries({ queryKey: keys.groups() });
  return {
    group: qc.getQueryData<PublicGroup>(keys.group(id)),
    lists: qc.getQueriesData<GroupPages>({ queryKey: keys.groups() }),
    membership: membershipKey ? qc.getQueryData<MemberStatus | null>(membershipKey) : undefined,
  };
}

function restore(qc: QueryClient, id: string, s: Snapshot | undefined, membershipKey?: readonly unknown[]) {
  if (!s) return;
  qc.setQueryData(keys.group(id), s.group);
  for (const [key, data] of s.lists) qc.setQueryData(key, data);
  if (membershipKey) qc.setQueryData(membershipKey, s.membership);
}

// ── Đọc ───────────────────────────────────────────────────────────────────────────
export function useGroupList(query: Omit<GroupQuery, 'cursor'>, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { kind, ...filters } = query;
  const result = useInfiniteQuery<GroupPage, AppError, GroupPages, readonly unknown[], string | null>({
    queryKey: keys.groups(kind, filters),
    queryFn: ({ pageParam }) => unwrap(searchGroups(client, { ...query, cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
    enabled: opts.enabled ?? true,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

/** Nhóm sắp diễn ra do một người tạo (hồ sơ công khai), cursor; cùng dạng trang với useGroupList (cache nhóm dùng chung). */
export function useHostGroups(hostId: string | undefined) {
  const client = useSupabase();
  const result = useInfiniteQuery<GroupPage, AppError, GroupPages, readonly unknown[], string | null>({
    queryKey: keys.hostGroups(hostId ?? ''),
    queryFn: ({ pageParam }) => unwrap(listGroupsByHost(client, { hostId: hostId ?? '', cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!hostId,
    staleTime: 60_000,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

export function useGroup(id: string | undefined) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useQuery<PublicGroup, AppError>({
    queryKey: keys.group(id ?? ''),
    queryFn: () => unwrap(getGroup(client, id ?? '')),
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: () => (id ? findCachedGroup(qc, id) : undefined),
  });
}

export function useGroupBySlug(slug: string | undefined) {
  const client = useSupabase();
  return useQuery<PublicGroup, AppError>({
    queryKey: keys.groupBySlug(slug ?? ''),
    queryFn: () => unwrap(getGroupBySlug(client, slug ?? '')),
    enabled: !!slug,
    staleTime: 30_000,
  });
}

/** Trạng thái của mình trong nhóm (null = chưa tham gia; khách luôn null, không gọi server). */
export function useMyMembership(groupId: string | undefined) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<MemberStatus | null, AppError>({
    queryKey: keys.groupMembership(groupId ?? '', userId ?? ''),
    queryFn: () => unwrap(getMyMembership(client, groupId ?? '')),
    enabled: !!groupId && !!userId,
    staleTime: 30_000,
  });
}

/** Thành viên + người xin (chủ nhóm) theo RLS. */
export function useGroupMembers(groupId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<GroupMember[], AppError>({
    queryKey: keys.groupMembers(groupId ?? ''),
    queryFn: () => unwrap(listGroupMembers(client, groupId ?? '')),
    enabled: !!groupId && (opts.enabled ?? true),
    staleTime: 15_000,
  });
}

/** Realtime khi đang xem chi tiết (chủ nhóm / thành viên): người xin mới, được duyệt, chỗ trống đổi. */
export function useGroupRealtime(groupId: string | undefined, enabled = true) {
  const client = useSupabase();
  const qc = useQueryClient();
  useEffect(() => {
    if (!groupId || !enabled) return;
    return subscribeToGroup(client, groupId, () => {
      void qc.invalidateQueries({ queryKey: keys.group(groupId) });
    });
  }, [client, qc, groupId, enabled]);
}

// ── Ghi ───────────────────────────────────────────────────────────────────────────
export function useCreateGroup() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedGroup, AppError, Parameters<typeof createGroup>[1]>({
    mutationFn: (input) => unwrap(createGroup(client, input)),
    onSuccess: (g) => invalidateGroup(qc, g.id),
  });
}

export function useUpdateGroup(id: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedGroup, AppError, UpdateGroupInput>({
    mutationFn: (input) => unwrap(updateGroup(client, id, input)),
    onSettled: () => invalidateGroup(qc, id),
  });
}

/** Huỷ nhóm (chủ nhóm): nhãn "Đã huỷ" hiện ngay, lỗi → trả lại. */
export function useCancelGroup(id: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<SavedGroup, AppError, void, Snapshot>({
    mutationFn: () => unwrap(cancelGroup(client, id)),
    onMutate: async () => {
      const s = await snapshot(qc, id);
      patchGroupCaches(qc, id, (g) => ({ ...g, status: 'cancelled' }));
      return s;
    },
    onError: (_e, _v, s) => restore(qc, id, s),
    onSettled: () => invalidateGroup(qc, id),
  });
}

export type JoinGroupVars = {
  note?: string;
  /** Nhóm không cần duyệt → accepted ngay: tăng chỗ + thêm avatar của mình (hiệu ứng bay vào hàng avatar). */
  requiresApproval: boolean;
  me?: GroupMemberPreview;
};

export function useJoinGroup(groupId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const membershipKey = keys.groupMembership(groupId, userId ?? '');
  return useMutation<MemberStatus, AppError, JoinGroupVars, Snapshot>({
    mutationFn: ({ note }) => unwrap(joinGroup(client, { groupId, note: note || undefined })),
    onMutate: async (v) => {
      const s = await snapshot(qc, groupId, membershipKey);
      qc.setQueryData<MemberStatus | null>(membershipKey, v.requiresApproval ? 'requested' : 'accepted');
      if (!v.requiresApproval) patchGroupCaches(qc, groupId, (g) => withSeats(g, 1, v.me));
      return s;
    },
    onSuccess: (status) => qc.setQueryData<MemberStatus | null>(membershipKey, status),
    onError: (_e, _v, s) => restore(qc, groupId, s, membershipKey),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

/** Rời nhóm / rút yêu cầu. */
export function useLeaveGroup(groupId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const membershipKey = keys.groupMembership(groupId, userId ?? '');
  return useMutation<null, AppError, void, Snapshot>({
    mutationFn: () => unwrap(leaveGroup(client, groupId)),
    onMutate: async () => {
      const s = await snapshot(qc, groupId, membershipKey);
      const wasMember = s.membership === 'accepted';
      qc.setQueryData<MemberStatus | null>(membershipKey, 'left');
      if (wasMember && userId) patchGroupCaches(qc, groupId, (g) => withSeats(g, -1, undefined, userId));
      return s;
    },
    onError: (_e, _v, s) => restore(qc, groupId, s, membershipKey),
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

export type RespondJoinVars = { userId: string; accept: boolean; member?: GroupMemberPreview };

/** Chủ nhóm nhận / từ chối: dòng yêu cầu đổi trạng thái ngay, nhận → tăng chỗ + thêm avatar. */
export function useRespondJoin(groupId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<MemberStatus, AppError, RespondJoinVars, Snapshot & { members?: GroupMember[] }>({
    mutationFn: ({ userId, accept }) => unwrap(respondJoin(client, { groupId, userId, accept })),
    onMutate: async (v) => {
      const s = await snapshot(qc, groupId);
      await qc.cancelQueries({ queryKey: keys.groupMembers(groupId) });
      const members = qc.getQueryData<GroupMember[]>(keys.groupMembers(groupId));
      qc.setQueryData<GroupMember[]>(keys.groupMembers(groupId), (list) =>
        list?.map((m) => (m.user_id === v.userId ? { ...m, status: v.accept ? 'accepted' : 'declined' } : m)),
      );
      if (v.accept) patchGroupCaches(qc, groupId, (g) => withSeats(g, 1, v.member));
      return { ...s, members };
    },
    onError: (_e, _v, s) => {
      restore(qc, groupId, s);
      if (s?.members) qc.setQueryData(keys.groupMembers(groupId), s.members);
    },
    onSettled: () => invalidateGroup(qc, groupId),
  });
}

// ── Nhóm của tôi, đánh giá (tuần 8) ──────────────────────────────────────────────────
type MyGroupPages = InfiniteData<MyGroupPage, string | null>;

/** Nhóm của tôi theo tab: sắp tới (sớm nhất trước) / đã qua (mới nhất trước). Khách → không gọi. */
export function useMyGroups(tab: MyGroupsTab) {
  const client = useSupabase();
  const { userId } = useSession();
  const result = useInfiniteQuery<MyGroupPage, AppError, MyGroupPages, readonly unknown[], string | null>({
    queryKey: keys.myGroups(tab),
    queryFn: ({ pageParam }) => unwrap(listMyGroups(client, { tab, cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { ...result, items: result.data?.pages.flatMap((p) => p.items) ?? [] };
}

/** Điểm mình đã chấm nhóm (null = chưa). */
export function useMyGroupRating(groupId: string | undefined) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<number | null, AppError>({
    queryKey: [...keys.group(groupId ?? ''), 'my-rating', userId ?? ''],
    queryFn: () => unwrap(getMyGroupRating(client, groupId ?? '')),
    enabled: !!groupId && !!userId,
    staleTime: 60_000,
  });
}

/** Chấm chủ nhóm: nút "Đánh giá" thành "Bạn đã chấm N/5" ngay; lỗi → trả lại. */
export function useRateGroup(groupId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  const ratingKey = [...keys.group(groupId), 'my-rating', userId ?? ''];
  return useMutation<null, AppError, Omit<RateGroupInput, 'groupId'>, { prev?: number | null }>({
    mutationFn: (v) => unwrap(rateGroup(client, { ...v, groupId })),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ratingKey });
      const prev = qc.getQueryData<number | null>(ratingKey);
      qc.setQueryData<number | null>(ratingKey, v.score);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(ratingKey, ctx?.prev ?? null),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.myGroups() });
      void qc.invalidateQueries({ queryKey: keys.group(groupId) });
    },
  });
}
