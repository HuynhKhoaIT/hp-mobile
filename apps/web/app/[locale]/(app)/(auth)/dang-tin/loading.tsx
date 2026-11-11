import { ListingFormSkeleton } from '@/features/listing/components/post-listing-view';

export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-3xl pb-6 sm:px-4 sm:pt-6">
      <ListingFormSkeleton />
    </section>
  );
}
