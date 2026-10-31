import { ListingFormSkeleton } from '@/features/listing/components/post-listing-view';

export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6">
      <ListingFormSkeleton />
    </section>
  );
}
