import { notFound } from 'next/navigation';
import { TicketPageClient } from './TicketPageClient';

// Bu, `web/`-in özündə çalışdığı origin — SSR zamanı Express-ə birbaşa müraciət üçün istifadə
// olunur (next.config.ts-dəki /api/* rewrite-i browser tərəfi üçündür, server-side fetch üçün
// tam URL lazımdır). Lokal dev-də .env-də NEXT_PUBLIC_SITE_URL varsa ondan, yoxdursa production
// domenindən istifadə edir — server.ts-dəki SITE_URL sabiti ilə eyni dəyərdir.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gotabiat.com';

export interface TicketContext {
  booking: {
    id: string;
    reference: string;
    customerName: string;
    customerPhone: string;
    travelDate: string | null;
    participantsCount: number;
    totalAmount: number;
    status: string;
  };
  tour: {
    name: string;
    region?: string;
    slug?: string;
    meetingPoint?: string;
    meetingPointLat?: number;
    meetingPointLng?: number;
    meetingPointEmbedUrl?: string;
  } | null;
  vendor: {
    companyName?: string;
    phone?: string;
    email?: string;
  } | null;
  ticketPdfUrl: string;
}

async function getTicketContext(ref: string): Promise<TicketContext | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/bookings/ticket/${encodeURIComponent(ref)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function TicketPage({ params }: { params: { ref: string } }) {
  const { ref } = params;
  const data = await getTicketContext(ref);
  if (!data) return notFound();

  return <TicketPageClient data={data} reference={ref} />;
}
