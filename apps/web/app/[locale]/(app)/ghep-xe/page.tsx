// /ghep-xe — Ghép xe về quê: danh sách dùng chung features/group (khác biệt ở features/ride/config.ts).
import type { Metadata } from 'next';
import { GroupListPage } from '@/features/group/components/group-list-page';
import { groupListMetadata } from '@/features/group/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/ghep-xe'>): Promise<Metadata> {
  return groupListMetadata('ride', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/ghep-xe'>) {
  return <GroupListPage kind="ride" searchParams={searchParams} />;
}
