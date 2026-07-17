import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { User } from '@/types';
import { getTours, SITE_URL } from '@/lib/api';
import { seedUsers } from '@/data/toursData';
import { OrganizerClient } from './OrganizerClient';

export const dynamic = 'force-dynamic';

type Params = { id: string };

/**
 * There is no public `/api/users/:id` endpoint, so the organizer identity is sourced the same
 * way the old public SPA did: from seedUsers, falling back to the vendor snapshot carried on
 * their tours (vendorName / whatsapp_number). Enough to render a public profile + tour list.
 */
async function resolveOrganizer(id: string): Promise<{ organizer: User; tours: import('@/types').Tour[] } | null> {
  const allTours = await getTours();
  const vendorTours = allTours.filter((t) => t.vendorId === id && t.status === 'approved');
  const seeded = seedUsers.find((u) => u.id === id);

  if (seeded) return { organizer: seeded, tours: allTours };
  if (vendorTours.length === 0) return null;

  const snapshot = vendorTours[0];
  const organizer: User = {
    id,
    name: snapshot.vendorName || 'Tur operatoru',
    role: 'vendor',
    companyName: snapshot.vendorName,
    phone: snapshot.whatsapp_number || '',
    whatsapp_number: snapshot.whatsapp_number,
    guides: [],
  } as User;
  return { organizer, tours: allTours };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveOrganizer(id);
  if (!resolved) return { title: 'Operator tapılmadı', robots: { index: false } };
  const name = resolved.organizer.companyName || resolved.organizer.name;
  return {
    title: name,
    description: `${name} tərəfindən təşkil olunan turlar.`,
    alternates: { canonical: `${SITE_URL}/organizer/${id}` },
  };
}

export default async function OrganizerPageRoute({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const resolved = await resolveOrganizer(id);
  if (!resolved) notFound();
  return <OrganizerClient organizer={resolved.organizer} tours={resolved.tours} />;
}
