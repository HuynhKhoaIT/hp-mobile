// Thành phần cho MDX (content/legal, content/blog): kiểu chữ theo token + chỗ điền thông tin người vận hành từ env.
// Tên người vận hành / email không viết cứng trong nội dung; chưa cấu hình → hiện "đang cập nhật" (không bịa).
import { APP_NAME } from '@hp/shared';
import type { MDXComponents } from 'mdx/types';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { publicEnv } from '@/lib/env';

async function Operator() {
  if (publicEnv.operatorName) return <>{publicEnv.operatorName}</>;
  const t = await getTranslations('web.content');
  return <span className="text-muted">{t('operator_pending')}</span>;
}

async function ContactEmail() {
  if (publicEnv.contactEmail) {
    return (
      <a href={`mailto:${publicEnv.contactEmail}`} className="text-primary underline">
        {publicEnv.contactEmail}
      </a>
    );
  }
  const t = await getTranslations('web.content');
  return <span className="text-muted">{t('email_pending')}</span>;
}

async function DeleteAccountLink() {
  const t = await getTranslations('web.content');
  return (
    <Link
      href="/toi/cai-dat"
      className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-md font-semibold text-on-primary outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {t('delete_cta')}
    </Link>
  );
}

const components: MDXComponents = {
  h2: (props) => <h2 className="mt-4 text-xl font-semibold text-fg" {...props} />,
  h3: (props) => <h3 className="mt-2 text-lg font-semibold text-fg" {...props} />,
  p: (props) => <p className="text-md text-fg" {...props} />,
  ul: (props) => <ul className="flex list-disc flex-col gap-1 pl-5 text-md text-fg" {...props} />,
  ol: (props) => <ol className="flex list-decimal flex-col gap-1 pl-5 text-md text-fg" {...props} />,
  a: (props) => <a className="text-primary underline" {...props} />,
  AppName: () => <>{APP_NAME}</>,
  Operator,
  ContactEmail,
  DeleteAccountLink,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
