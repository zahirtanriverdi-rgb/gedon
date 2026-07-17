'use client';

import { useRouter } from 'next/navigation';
import type { Tour, User } from '@/types';
import OrganizerProfile from '@/components/OrganizerProfile';

// Thin client wrapper supplying navigation callbacks to the (otherwise presentational)
// OrganizerProfile. Organizer + tours are server-fetched and passed in as props (SSR content).
export function OrganizerClient({ organizer, tours }: { organizer: User; tours: Tour[] }) {
  const router = useRouter();
  return (
    <OrganizerProfile
      organizer={organizer}
      tours={tours}
      onBack={() => router.back()}
      onTourClick={(tour) => router.push(`/tours/${tour.slug || tour.id}`)}
    />
  );
}
