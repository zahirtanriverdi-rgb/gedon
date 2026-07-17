'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OperatorLogin from '@/components/OperatorLogin';
import { useAuth } from '@/lib/auth';

export default function VendorLoginRoute() {
  const router = useRouter();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) router.replace('/vendor/dashboard');
  }, [user, router]);

  return (
    <OperatorLogin
      onLogin={(u, token) => {
        login(u, token);
        router.replace('/vendor/dashboard');
      }}
    />
  );
}
