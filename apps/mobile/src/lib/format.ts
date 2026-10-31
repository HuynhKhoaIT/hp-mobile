// Định dạng theo ngôn ngữ đang dùng — màn hình chỉ gọi các hàm này (không toLocaleString tự do).
// Logic ở @hp/shared/format (dùng chung web); ở đây chỉ gắn locale hiện tại của app.
import {
  type DateStyle,
  formatDate as formatDateShared,
  formatDistance as formatDistanceShared,
  formatMoney as formatMoneyShared,
  formatNumber as formatNumberShared,
  formatRelative as formatRelativeShared,
} from '@hp/shared/format';
import { getLocale } from '@/core/i18n';

export const formatMoney = (amount: number) => formatMoneyShared(amount, getLocale());
export const formatNumber = (value: number) => formatNumberShared(value, getLocale());
export const formatDistance = (meters: number) => formatDistanceShared(meters, getLocale());
export const formatDate = (input: Date | string | number, style?: DateStyle) => formatDateShared(input, getLocale(), style);
export const formatRelative = (input: Date | string | number) => formatRelativeShared(input, getLocale());
