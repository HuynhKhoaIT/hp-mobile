// /dang-nhap?next=<đường dẫn>&error=<mã> — số điện thoại → OTP → onboarding (nếu cần) → quay về `next`.
// searchParams đọc theo request → nằm trong Suspense; khung trang vẫn prerender.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { LoginFlow } from '@/features/auth/components/login-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.login');
  return { title: t('title') };
}

async function LoginContent({ searchParams }: { searchParams: PageProps<'/[locale]/dang-nhap'>['searchParams'] }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/';
  const error = typeof params.error === 'string' ? params.error : null;
  return <LoginFlow next={next} initialError={error} />;
}

export default function LoginPage({ searchParams }: PageProps<'/[locale]/dang-nhap'>) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-lg bg-surface p-6 shadow-card">
        <Suspense fallback={<TextLinesSkeleton lines={4} />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
