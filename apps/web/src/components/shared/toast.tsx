'use client';

// Toast tối giản (không thư viện): một thông báo ngắn ở đáy màn hình, tự ẩn sau 4 giây, đọc bởi trình đọc màn hình
// (role="status"). Đặt trên BottomNav ở điện thoại. Chữ do nơi gọi truyền vào (đã qua t()).
// Provider đặt ở layout gốc; component gọi useToast().show(message, tone).
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'error';
type ToastState = { id: number; message: string; tone: Tone } | null;

const ToastContext = createContext<{ show: (message: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = 'default') => {
    if (timer.current) clearTimeout(timer.current);
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message, tone }));
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-6">
        {/* Vùng live tồn tại sẵn (kể cả khi trống) để trình đọc màn hình đọc thông báo mới. */}
        <div role="status" aria-live="polite" className="contents">
          {toast ? (
            <p
              key={toast.id}
              className={cn(
                'pointer-events-auto max-w-md rounded-md px-4 py-3 text-md font-medium shadow-card animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:slide-in-from-bottom-0',
                toast.tone === 'error' ? 'bg-danger text-on-primary' : 'bg-fg text-surface',
              )}
            >
              {toast.message}
            </p>
          ) : null}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/** show(message, tone) — ngoài Provider (không nên xảy ra) thì bỏ qua. */
export function useToast() {
  return useContext(ToastContext) ?? { show: () => undefined };
}
