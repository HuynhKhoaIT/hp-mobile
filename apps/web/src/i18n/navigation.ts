// Link / redirect / useRouter / usePathname có locale. Dùng thay next/link và next/navigation (ESLint chặn).
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
