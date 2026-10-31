// cn(): ghép class Tailwind, class sau thắng class trước cùng nhóm (dùng trong mọi component shadcn).
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
