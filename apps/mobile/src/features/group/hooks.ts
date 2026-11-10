// Hook riêng mobile của engine Group — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, requireAuth, toast,
// haptic, Share sheet, analytics). Không gọi supabase trực tiếp, không khai báo query key. Optimistic + rollback của
// tham gia / rời / duyệt / huỷ nằm trong hook của @hp/core (useJoinGroup…); ở đây chỉ báo kết quả.
import type { GroupMember, PublicGroup } from '@hp/core';
import {
  useCancelGroup,
  useGroupList,
  useGroupMembers,
  useGroupRealtime,
  useJoinGroup,
  useLeaveGroup,
  useMyGroupRating,
  useMyMembership,
  useMyProfile,
  useRateGroup,
  useRespondJoin,
  useSession,
  useSites,
  useVenues,
} from '@hp/core/react';
import {
  APP_NAME,
  type GroupDisplayStatus,
  type GroupKind,
  type GroupTimeWindow,
  type GroupViewerRole,
  groupViewerRole,
  shortName,
} from '@hp/shared';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share } from 'react-native';
import { track } from '@/core/analytics';
import { requireAuth } from '@/core/auth';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { groupShareUrl } from '@/lib/urls';
import { toast } from '@/ui';
import { openCreateGroup } from './navigation';
import type { GroupFeatureConfig } from './types';

/** Giá trị chip "Tất cả" / "Mọi ngày" (không lọc). */
export const ALL = '' as const;

/**
 * State màn danh sách: từ khoá (gõ / đã tìm), loại con, khoảng ngày → useGroupList (cursor, staleTime 60s).
 * Danh sách chỉ có nhóm chưa tới giờ (search_groups lọc starts_at > now()).
 */
export function useGroupBrowser(config: GroupFeatureConfig) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [subKind, setSubKind] = useState<string>(ALL);
  const [when, setWhen] = useState<GroupTimeWindow | typeof ALL>(ALL);

  const filters = useMemo(
    () => ({
      kind: config.kind,
      ...(subKind !== ALL ? { subKinds: [subKind] } : {}),
      ...(query ? { query } : {}),
      ...(when !== ALL ? { when } : {}),
    }),
    [config.kind, subKind, query, when],
  );
  const list = useGroupList(filters);

  return {
    ...list,
    input,
    setInput,
    /** Tìm theo chữ đang gõ (bàn phím "Tìm"). */
    submit: (text: string) => setQuery(text.trim()),
    subKind,
    setSubKind,
    when,
    setWhen,
    /** Đang lọc → rỗng là "không có nhóm phù hợp", không phải "chưa có nhóm". */
    isFiltered: !!query || subKind !== ALL || when !== ALL,
  };
}

/**
 * Điểm đi mặc định của form: "Cổng <tên khu>" theo profile.site (danh sách khu cache 1 giờ). Toạ độ khu chưa có
 * trong @hp/core (listSites chỉ trả code + name) → origin_lat / lng gửi null. `ready`: đã biết tên khu (hoặc lỗi).
 */
export function useDefaultOrigin(site: string | null | undefined) {
  const { t } = useTranslation('group');
  const sites = useSites();
  const name = site ? sites.data?.find((s) => s.code === site)?.name : undefined;
  return { ready: !site || !sites.isLoading, text: name ? t('form.origin_default', { site: name }) : '' };
}

/** Tạo nhóm: khách → đăng nhập trước, rồi mở form của kind. */
export function useCreateGroupAction(kind: GroupKind) {
  return () => requireAuth(() => openCreateGroup(kind));
}

/**
 * Vai trò người xem với nhóm (khách / chủ nhóm / chưa tham gia / đã xin / thành viên / bị từ chối / đã rời) —
 * client chỉ ẩn / hiện nút, server (RLS + Edge Function) quyết định. `loading`: đang đọc trạng thái của mình.
 */
export function useGroupViewer(group: Pick<PublicGroup, 'id' | 'host_id'>) {
  const { userId, isLoading: sessionLoading } = useSession();
  const isHost = !!userId && userId === group.host_id;
  const membership = useMyMembership(userId && !isHost ? group.id : undefined);
  const role = groupViewerRole(group, userId, membership.data);
  // Thành viên / chủ nhóm / người đang chờ duyệt: nghe realtime (người xin mới, được duyệt, chỗ trống đổi).
  useGroupRealtime(group.id, role === 'host' || role === 'member' || role === 'requested');
  return { userId, role, loading: sessionLoading || membership.isLoading };
}

/**
 * Tham gia / xin tham gia / rời / rút yêu cầu / huỷ nhóm. Khách → đăng nhập rồi làm tiếp (requireAuth).
 * Tham gia ngay (không cần duyệt): avatar của mình được thêm lạc quan vào hàng thành viên + chỗ trống giảm ngay
 * (useJoinGroup) → hiệu ứng bay vào / đếm ngược ở chi tiết. Thành công: haptic nhẹ + toast + event `join_group`.
 */
export function useGroupActions(group: PublicGroup) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const me = useMyProfile();
  const join = useJoinGroup(group.id);
  const leave = useLeaveGroup(group.id);
  const cancel = useCancelGroup(group.id);
  const fail = (e: { code: string }) => toast.show(errorText(e.code), 'danger');

  const runJoin = (note: string | undefined, onDone?: () => void) => {
    const profile = me.data;
    join.mutate(
      {
        note: note?.trim() || undefined,
        requiresApproval: group.requires_approval,
        me: profile ? { id: profile.id, name: shortName(profile.full_name), avatar_url: profile.avatar_url } : undefined,
      },
      {
        onSuccess: (status) => {
          track('join_group', { group_id: group.id, kind: group.kind, sub_kind: group.sub_kind, status });
          if (status === 'accepted') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toast.show(t('action.joined_toast'), 'success');
          } else {
            toast.show(t('action.requested_toast'), 'success');
          }
          onDone?.();
        },
        onError: fail,
      },
    );
  };

  return {
    /** Nhóm vào ngay: bấm là tham gia. */
    join: () => requireAuth(() => runJoin(undefined)),
    /** Nhóm cần duyệt: mở sheet lời nhắn (khách đăng nhập trước). */
    openRequest: (open: () => void) => requireAuth(open),
    sendRequest: (note: string, onDone: () => void) => runJoin(note, onDone),
    joining: join.isPending,
    leave: (wasRequest: boolean, onDone: () => void) =>
      leave.mutate(undefined, {
        onSuccess: () => {
          toast.show(t(wasRequest ? 'action.request_cancelled_toast' : 'action.left_toast'), 'success');
          onDone();
        },
        onError: fail,
      }),
    leaving: leave.isPending,
    cancel: (onDone: () => void) =>
      cancel.mutate(undefined, {
        onSuccess: () => {
          toast.show(t('action.cancelled_toast'), 'success');
          onDone();
        },
        onError: fail,
      }),
    cancelling: cancel.isPending,
  };
}

/**
 * Chủ nhóm: danh sách người xin (status requested, kèm lời nhắn) + Nhận / Từ chối. Dòng đổi trạng thái ngay
 * (optimistic trong useRespondJoin), nhận → tăng chỗ + thêm avatar; lỗi → trả lại + toast errors.<code>.
 */
export function useJoinRequests(groupId: string, enabled: boolean) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const members = useGroupMembers(groupId, { enabled });
  const respond = useRespondJoin(groupId);
  const pending = (members.data ?? []).filter((m) => m.status === 'requested');

  const answer = (m: GroupMember, accept: boolean) =>
    respond.mutate(
      { userId: m.user_id, accept, member: accept ? { id: m.user_id, name: m.display_name, avatar_url: m.avatar_url } : undefined },
      {
        onSuccess: () => toast.show(t(accept ? 'requests.accepted_toast' : 'requests.declined_toast', { name: m.display_name }), 'success'),
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      },
    );

  return {
    ...members,
    pending,
    accept: (m: GroupMember) => answer(m, true),
    decline: (m: GroupMember) => answer(m, false),
    /** Dòng đang gửi Nhận / Từ chối (khoá hai nút của dòng đó). */
    busyId: respond.isPending ? (respond.variables?.userId ?? null) : null,
  };
}

/** Chia sẻ nhóm qua Share sheet hệ thống — luôn URL web https://tenapp.vn/nhom/{slug}. */
export function useShareGroup() {
  const { t } = useTranslation();
  return (group: Pick<PublicGroup, 'slug' | 'title' | 'starts_at'>) => {
    if (!group.slug) return;
    const url = groupShareUrl(group.slug);
    const text = t('group:detail.share_text', { title: group.title, time: formatDate(group.starts_at, 'datetime'), app: APP_NAME });
    // iOS nhận url riêng (xem trước link); Android chỉ có message → gắn link vào cuối.
    const content = Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}` };
    Share.share(content).catch(() => toast.show(t('errors:unknown'), 'danger'));
  };
}

/** Số sân hiện trong danh sách chọn (tìm thêm bằng ô tìm kiếm). */
const VENUE_LIMIT = 8;

/**
 * Danh sách chọn sân ở form tạo kèo: sân đã duyệt theo môn đang chọn + khu của mình (useVenues, cache 5 phút); tìm theo
 * chữ khi bấm Tìm (không gọi server theo từng ký tự). `enabled` = false khi đã chọn sân / đang tự nhập.
 */
export function useVenuePicker(opts: { sport: string; site: string | null | undefined; enabled: boolean }) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const venues = useVenues(
    { sport: opts.sport || undefined, site: opts.site ?? undefined, query: query || undefined, limit: VENUE_LIMIT },
    { enabled: opts.enabled },
  );
  return {
    items: venues.data ?? [],
    isLoading: venues.isLoading,
    isError: venues.isError,
    errorCode: venues.error?.code,
    refetch: () => void venues.refetch(),
    input,
    setInput,
    /** Tìm theo chữ đang gõ (bàn phím "Tìm" / nút xoá). */
    submit: (text: string) => setQuery(text.trim()),
  };
}

/**
 * Được chấm chủ nhóm: thành viên đã được nhận, nhóm đã diễn ra (đang diễn ra / đã xong / quá giờ), chưa huỷ.
 * Client chỉ ẩn / hiện — RPC rate_group kiểm lại (group_not_finished, already_rated, forbidden).
 */
export const canRateGroup = (role: GroupViewerRole, status: GroupDisplayStatus) =>
  role === 'member' && (status === 'started' || status === 'completed');

/**
 * Đánh giá chủ nhóm: điểm mình đã chấm (null = chưa) + gửi điểm (optimistic trong useRateGroup → "Bạn đã chấm N/5"
 * hiện ngay). Thành công → toast cảm ơn; lỗi → trả lại + toast errors.<code>. `enabled` = false → không đọc điểm.
 */
export function useGroupRating(groupId: string, enabled = true) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const mine = useMyGroupRating(enabled ? groupId : undefined);
  const rate = useRateGroup(groupId);
  return {
    score: mine.data ?? null,
    isLoading: enabled && mine.isLoading,
    submit: (score: number, comment: string, onDone: () => void) =>
      rate.mutate(
        { score, comment: comment.trim() || null },
        {
          onSuccess: () => {
            toast.show(t('rate.done'), 'success');
            onDone();
          },
          onError: (e) => toast.show(errorText(e.code), 'danger'),
        },
      ),
    isPending: rate.isPending,
  };
}
