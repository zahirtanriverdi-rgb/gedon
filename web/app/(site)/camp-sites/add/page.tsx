'use client';

import { useRouter } from 'next/navigation';
import { CampSiteAddPage } from '@/components/customer/CampSiteAddPage';

export default function CampSiteAddRoute() {
  const router = useRouter();
  return <CampSiteAddPage onBack={() => router.push('/camp-sites')} />;
}
