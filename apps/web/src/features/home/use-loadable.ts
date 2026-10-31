'use client';

// Tải một khối dữ liệu của trang chủ ở trình duyệt (web chưa có TanStack Query — thêm thư viện cần hỏi): hàm thuần của
// @hp/core với createBrowserClient(). Có dữ liệu server render sẵn (`initial`, cùng `key`) → dùng luôn, không gọi lại.
// Đổi `key` (vd đổi khu) → tải lại; `retry()` → tải lại khối lỗi. `key = null` → tắt (chưa đủ điều kiện, vd chưa biết phiên).
// State gắn với key + lần thử nên không cần setState đồng bộ trong effect: khác key = đang tải.
import type { Result } from '@hp/core';
import { useCallback, useEffect, useState } from 'react';

export type Loadable<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: string };

type Entry<T> = { id: string; result: Result<T> };

export function useLoadable<T>(
  key: string | null,
  /** Ổn định (useCallback) theo đúng các giá trị tạo nên `key`. */
  load: () => Promise<Result<T>>,
  initial?: { key: string; data: T } | null,
): [Loadable<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const id = key === null ? null : `${key}#${attempt}`;
  const [entry, setEntry] = useState<Entry<T> | null>(() =>
    initial ? { id: `${initial.key}#0`, result: { data: initial.data, error: null } } : null,
  );

  useEffect(() => {
    if (id === null || entry?.id === id) return;
    let active = true;
    load()
      .catch((): Result<T> => ({ data: null, error: { code: 'network', message: 'network' } }))
      .then((result) => {
        if (active) setEntry({ id, result });
      });
    return () => {
      active = false;
    };
  }, [id, entry?.id, load]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  if (id === null) return [{ status: 'idle' }, retry];
  if (entry?.id !== id) return [{ status: 'loading' }, retry];
  return [entry.result.error ? { status: 'error', code: entry.result.error.code } : { status: 'ready', data: entry.result.data }, retry];
}
