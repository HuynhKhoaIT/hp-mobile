'use client';

// Người dùng hiện tại ở trình duyệt (để chọn: khách → LoginDialog, đã đăng nhập → hành động). Chỉ là UI:
// quyền thật do RLS / server quyết định. undefined = đang kiểm tra, null = khách.
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useSessionUser(): string | null | undefined {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const client = createBrowserClient();
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return userId;
}
