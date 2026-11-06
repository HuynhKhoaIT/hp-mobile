// Bọc LeadForm với đúng phần chữ nó cần: ns `web.marketing` không gửi xuống client ở layout gốc (nhẹ HTML mọi trang).
import type { LeadKind } from '@hp/shared';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { LeadForm } from './lead-form';

export async function LeadSection({ source, defaultKind }: { source: string; defaultKind?: LeadKind }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={{ web: { marketing: { lead: messages.web.marketing.lead } }, errors: messages.errors }}>
      <LeadForm source={source} defaultKind={defaultKind} />
    </NextIntlClientProvider>
  );
}
