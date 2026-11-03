// /admin/users?q=&role=&state=&sort=&page= — tìm người dùng theo tên / SĐT, lọc vai trò / tình trạng (moderator+).
import { USER_STATES } from '@hp/core';
import { ROLES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { UsersTable } from '@/features/admin/users/components/users-table';
import { getUsersPage } from '@/features/admin/users/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('users') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/users'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tRole] = await Promise.all([getUsersPage(params), getTranslations('admin.users'), getTranslations('admin.role')]);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        values={data.query}
        keep={data.query.sort ? { sort: data.query.sort } : {}}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q'), placeholder: t('filter.q_placeholder') },
          { type: 'select', name: 'role', label: t('filter.role'), options: ROLES.map((r) => ({ value: r, label: tRole(r) })) },
          { type: 'select', name: 'state', label: t('filter.state'), options: USER_STATES.map((s) => ({ value: s, label: t(`state.${s}`) })) },
        ]}
      />
      <UsersTable key={JSON.stringify(data.query)} data={data.page} query={data.query} now={data.now} />
    </div>
  );
}

export default async function UsersPage({ searchParams }: PageProps<'/[locale]/admin/users'>) {
  const t = await getTranslations('admin.users');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
