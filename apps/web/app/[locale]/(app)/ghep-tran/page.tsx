// /ghep-tran — Ghép trận: danh sách dùng chung features/group (khác biệt ở features/sport/config.ts).
import type { Metadata } from 'next';
import { GroupListPage } from '@/features/group/components/group-list-page';
import { groupListMetadata } from '@/features/group/metadata';

export function generateMetadata({ searchParams }: PageProps<'/[locale]/ghep-tran'>): Promise<Metadata> {
  return groupListMetadata('sport', searchParams);
}

export default function Page({ searchParams }: PageProps<'/[locale]/ghep-tran'>) {
  return <GroupListPage kind="sport" searchParams={searchParams} />;
}
