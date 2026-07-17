'use client';

import { useRouter } from 'next/navigation';
import FAQPage from '@/components/FAQPage';

export default function FaqRoute() {
  const router = useRouter();
  return <FAQPage onBack={() => router.push('/')} />;
}
