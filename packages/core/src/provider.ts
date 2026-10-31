// SupabaseProvider / useSupabase — app và web truyền client của mình vào; hook dùng chung đọc qua useSupabase().
// Viết bằng createElement (không JSX) để gói vẫn là .ts thuần, chạy được với node --test.
import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { Client } from './result';

const SupabaseContext = createContext<Client | null>(null);

export function SupabaseProvider({ client, children }: { client: Client; children?: ReactNode }) {
  return createElement(SupabaseContext.Provider, { value: client }, children);
}

/** Lỗi lập trình (quên bọc provider) nên throw ngay khi render, không trả Result. */
export function useSupabase(): Client {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error('useSupabase: thiếu <SupabaseProvider> ở gốc app');
  return client;
}
