import { GroupFormSkeleton } from '@/features/group/components/create-group-view';

export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <GroupFormSkeleton />
    </section>
  );
}
