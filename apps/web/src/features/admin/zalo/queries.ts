// Kết nối Zalo (moderator+): tài khoản Zalo đã kết nối của chính staff đang đăng nhập (RLS: chỉ dòng của mình, không có credentials).
import 'server-only';
import {
  type AdminPage,
  getLatestZaloQr,
  getZaloAccount,
  getZaloSettings,
  listZaloLog,
  listZaloSenders,
  listZaloTemplates,
  type ZaloLogItem,
  type ZaloSender,
  type ZaloSettings,
  type ZaloTemplate,
} from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { requireStaff } from '../session';
import { staffOrThrow, unwrap } from '../lib/server';
import type { ZaloConnection } from './actions';

export const ZALO_LOG_QUERY_KEYS = ['status', 'mode', 'kind', 'target', 'q', 'from', 'to', 'page'] as const;

export type ZaloLogData = { page: AdminPage<ZaloLogItem>; query: Query };

/** Nhật ký tin Zalo đã gửi (moderator+): view zalo_message_log chỉ trả dòng cho staff; bộ lọc / trang nằm trên URL. */
export async function getZaloLogPage(params: SearchParams): Promise<ZaloLogData> {
  const staff = await staffOrThrow();
  const page = await listZaloLog(staff.supabase, {
    status: pick(params, 'status'),
    mode: pick(params, 'mode'),
    kind: pick(params, 'kind'),
    target: pick(params, 'target'),
    q: pick(params, 'q'),
    from: pick(params, 'from'),
    to: pick(params, 'to'),
    page: pageOf(params),
  });
  return { page: unwrap(page), query: pickQuery(params, ZALO_LOG_QUERY_KEYS) };
}

export async function getZaloConnection(): Promise<ZaloConnection> {
  const staff = await staffOrThrow();
  const [account, qr] = await Promise.all([getZaloAccount(staff.supabase), getLatestZaloQr(staff.supabase)]);
  return { account: unwrap(account), qr: qr.error ? null : qr.data };
}

export type ZaloSettingsData =
  | { forbidden: true }
  | { forbidden: false; settings: ZaloSettings; templates: ZaloTemplate[]; senders: ZaloSender[] };

/** Cấu hình hạn mức + mẫu tin (chỉ admin): moderator mở → forbidden (trang hiện "chỉ quản trị viên"). */
export async function getZaloSettingsData(): Promise<ZaloSettingsData> {
  const check = await requireStaff('admin');
  if (!check.ok) {
    if (check.code === 'forbidden') return { forbidden: true };
    throw new Error(check.code);
  }
  const [settings, templates, senders] = await Promise.all([
    getZaloSettings(check.staff.supabase),
    listZaloTemplates(check.staff.supabase),
    listZaloSenders(check.staff.supabase),
  ]);
  return { forbidden: false, settings: unwrap(settings), templates: unwrap(templates), senders: unwrap(senders) };
}
