// Kết nối Zalo (moderator+): tài khoản Zalo đã kết nối của chính staff đang đăng nhập (RLS: chỉ dòng của mình, không có credentials).
import 'server-only';
import { getLatestZaloQr, getZaloAccount } from '@hp/core';
import { staffOrThrow, unwrap } from '../lib/server';
import type { ZaloConnection } from './actions';

export async function getZaloConnection(): Promise<ZaloConnection> {
  const staff = await staffOrThrow();
  const [account, qr] = await Promise.all([getZaloAccount(staff.supabase), getLatestZaloQr(staff.supabase)]);
  return { account: unwrap(account), qr: qr.error ? null : qr.data };
}
