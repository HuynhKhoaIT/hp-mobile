// Hook riêng mobile của hồ sơ: đổi ngôn ngữ (i18next + MMKV ngay, profiles.locale khi đã đăng nhập), đăng xuất,
// đổi ảnh đại diện, tên khu làm việc + số thông báo chưa đọc (hero tab Tôi), huy hiệu xác minh (chụp / chọn giấy tờ →
// nén → useRequestBadge), xoá tài khoản (useDeleteAccount → đăng xuất).
import {
  useDeleteAccount,
  useMyBadgeRequests,
  useMyProfile,
  useRequestBadge,
  useSites,
  useUnreadNotificationCount,
  useUpdateProfile,
  useUploadAvatar,
} from '@hp/core/react';
import { type Locale, REQUESTABLE_BADGES, type RequestableBadge } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signOutApp } from '@/core/auth';
import { getLocale, setLocale } from '@/core/i18n';
import { type PickedImage, pickImages, prepareVerificationImage, takePhoto } from '@/core/upload';
import { useErrorText } from '@/lib/errors';
import { toast } from '@/ui';
import { pickAvatar } from './avatar';

/** Đổi ngôn ngữ app; đã đăng nhập thì lưu cả profiles.locale (push / email theo ngôn ngữ này). Lỗi lưu không chặn đổi. */
export function useChangeLocale() {
  const { i18n } = useTranslation();
  const me = useMyProfile();
  const update = useUpdateProfile();
  const current: Locale = i18n.language === 'en' || i18n.language === 'zh' ? i18n.language : getLocale();
  return {
    current,
    change: (locale: Locale) => {
      void setLocale(locale);
      if (me.data && me.data.locale !== locale) update.mutate({ locale });
    },
  };
}

export function useSignOut() {
  const { t } = useTranslation('auth');
  return async () => {
    const res = await signOutApp();
    toast.show(res.error ? t('errors:unknown') : t('signed_out'), res.error ? 'danger' : 'info');
  };
}

/**
 * Đổi ảnh đại diện: chọn ảnh (pickAvatar: quyền + cắt vuông + nén) → useUploadAvatar (cache hồ sơ tự cập nhật).
 * Lỗi (chọn ảnh / tải lên) → `onError(code)`: onboarding hiện dưới nút, hero tab Tôi hiện toast.
 */
export function useAvatarChange(userId: string, onError: (code: string) => void) {
  const upload = useUploadAvatar();
  const [picking, setPicking] = useState(false);
  const choose = async () => {
    setPicking(true);
    const prepared = await pickAvatar();
    setPicking(false);
    if (!prepared) return;
    if ('error' in prepared) return onError(prepared.error);
    upload.mutate({ userId, ...prepared.data }, { onError: (e) => onError(e.code) });
  };
  return { choose: () => void choose(), isPending: picking || upload.isPending, isUploading: upload.isPending };
}

/** Tên khu làm việc của hồ sơ (sites.code = profiles.site); chưa chọn khu / danh sách chưa về → null. */
export function useSiteName(code: string | null | undefined) {
  const sites = useSites();
  return code ? (sites.data?.find((s) => s.code === code)?.name ?? null) : null;
}

/** Số thông báo chưa đọc (chuông ở hero tab Tôi; 0 khi khách). */
export function useUnreadCount() {
  return useUnreadNotificationCount().data ?? 0;
}

// ── Huy hiệu xác minh (tuần 10) ─────────────────────────────────────────────────

export type BadgeStatus = 'owned' | 'pending' | 'rejected' | 'none';
export type BadgeState = { badge: RequestableBadge; status: BadgeStatus; reason: string | null };

/**
 * 4 huy hiệu xin được (REQUESTABLE_BADGES) + trạng thái của mình: đã có (profiles.badges) → đang chờ duyệt / bị từ
 * chối (yêu cầu mới nhất của huy hiệu đó, kèm lý do) → chưa xin.
 */
export function useBadgeStates() {
  const me = useMyProfile();
  const requests = useMyBadgeRequests({ enabled: !!me.data });
  const owned = new Set(me.data?.badges ?? []);
  const states: BadgeState[] = REQUESTABLE_BADGES.map((badge) => {
    if (owned.has(badge)) return { badge, status: 'owned', reason: null };
    // Danh sách đã sắp mới nhất trước → yêu cầu đầu tiên của huy hiệu là trạng thái hiện tại.
    const latest = requests.data?.find((r) => r.badge === badge);
    if (latest?.status === 'pending') return { badge, status: 'pending', reason: null };
    if (latest?.status === 'rejected') return { badge, status: 'rejected', reason: latest.reject_reason };
    return { badge, status: 'none', reason: null };
  });
  return {
    me,
    states,
    isLoading: me.isLoading || (!!me.data && requests.isLoading),
    isError: me.isError || requests.isError,
    errorCode: (me.error ?? requests.error)?.code,
    refetch: () => Promise.allSettled([me.refetch(), requests.refetch()]),
  };
}

/**
 * Gửi giấy tờ xin huy hiệu: ảnh đã chọn → nén WebP cạnh dài 1600 px (≤ 5 MB) → useRequestBadge (upload bucket riêng tư
 * verification rồi gọi request-badge). Thành công → toast `submitted`; lỗi → toast `errors.<code>` (already_requested,
 * badge_owned, file_too_large, upload_failed, rate_limited, banned…).
 */
export function useSubmitBadgeRequest() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const request = useRequestBadge();
  const [preparing, setPreparing] = useState(false);

  const submit = async (badge: RequestableBadge, image: PickedImage, onDone: () => void) => {
    setPreparing(true);
    const prepared = await prepareVerificationImage(image);
    setPreparing(false);
    if ('error' in prepared) {
      toast.show(errorText(prepared.error), 'danger');
      return;
    }
    request.mutate(
      { badge, ...prepared.data, size: prepared.data.body.byteLength },
      {
        onSuccess: () => {
          toast.show(t('badge_request.submitted'), 'success');
          onDone();
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      },
    );
  };

  return { submit: (b: RequestableBadge, img: PickedImage, onDone: () => void) => void submit(b, img, onDone), isPending: preparing || request.isPending };
}

/** Chụp ảnh / chọn ảnh giấy tờ. Máy ảnh bị từ chối quyền → toast gợi ý chọn từ thư viện. */
export function usePickDocument(onPicked: (image: PickedImage) => void) {
  const { t } = useTranslation();
  return {
    camera: async () => {
      const res = await takePhoto();
      if (res === 'denied') toast.show(t('badge_request.camera_denied'), 'info');
      else if (res) onPicked(res);
    },
    library: async () => {
      const [img] = await pickImages(1);
      if (img) onPicked(img);
    },
  };
}

// ── Xoá tài khoản (tuần 10) ─────────────────────────────────────────────────────

/**
 * Xoá tài khoản (RPC delete_my_account: ẩn ngay, xoá hẳn sau 30 ngày) → đăng xuất bằng đường đăng xuất sẵn có (gỡ push
 * token, signOut, xoá cache) → toast `account.deleted`. Lỗi → toast `errors.<code>`, vẫn đăng nhập.
 */
export function useDeleteAccountFlow() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const remove = useDeleteAccount();
  const [signingOut, setSigningOut] = useState(false);
  return {
    confirmWord: t('account.delete_confirm_word'),
    isPending: remove.isPending || signingOut,
    run: (onDone: () => void) =>
      remove.mutate(undefined, {
        onSuccess: async () => {
          setSigningOut(true);
          await signOutApp().catch(() => undefined);
          setSigningOut(false);
          onDone();
          toast.show(t('account.deleted'), 'info');
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      }),
  };
}
