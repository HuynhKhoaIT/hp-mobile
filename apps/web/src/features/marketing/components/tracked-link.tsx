'use client';
// Link có ghi sự kiện (chỉ gửi sau khi đồng ý cookie) cho các nút trên trang marketing tĩnh. Link ngoài (store) mở tab mới.
import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { type AnalyticsEvent, type AnalyticsProps, track } from '@/lib/analytics';

type Tracked = { event: AnalyticsEvent; eventProps?: AnalyticsProps };

export function TrackedLink({ event, eventProps, ...props }: Tracked & ComponentProps<typeof Link>) {
  return <Link {...props} onClick={() => track(event, eventProps)} />;
}

export function TrackedExternalLink({ event, eventProps, ...props }: Tracked & ComponentProps<'a'>) {
  return <a {...props} target="_blank" rel="noopener noreferrer" onClick={() => track(event, eventProps)} />;
}
