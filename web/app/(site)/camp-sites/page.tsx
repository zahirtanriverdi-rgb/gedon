'use client';

import { useRouter } from 'next/navigation';
import { CampSitesPage } from '@/components/customer/CampSitesPage';

export default function CampSitesRoute() {
  const router = useRouter();
  return <CampSitesPage onBack={() => router.push('/')} onAddSite={() => router.push('/camp-sites/add')} />;
}
