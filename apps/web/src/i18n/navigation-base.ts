// Điều hướng có locale từ next-intl. Nơi khác import từ ./navigation (Link ở đó có prefetch theo ý định).
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link: BaseLink, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
