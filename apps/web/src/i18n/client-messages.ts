// Ns `web` cho NextIntlClientProvider: bỏ chữ marketing (chỉ dùng ở server; form lead nhận phần của nó qua LeadSection) để không
// gửi xuống mọi trang.
import type { Messages } from 'next-intl';

export function clientWebMessages(web: Messages['web']) {
  return Object.fromEntries(Object.entries(web).filter(([key]) => key !== 'marketing'));
}
