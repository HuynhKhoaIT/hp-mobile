// Hồ sơ không có / đã xoá / bị khoá / link sai: 404 + đường về tin mới đăng.
import { UserX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function ProfileNotFound() {
  const t = await getTranslations();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="sr-only">{t('common.profile.not_found')}</h1>
      <EmptyState
        icon={UserX}
        title={t('common.profile.not_found')}
        description={t('web.profile.not_found_body')}
        action={
          <Button asChild>
            <Link href="/tin">{t('common.profile.browse_cta')}</Link>
          </Button>
        }
      />
    </section>
  );
}
