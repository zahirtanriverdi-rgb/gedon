'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLogin from '@/components/AdminLogin';
import { useAuth } from '@/lib/auth';

export default function AdminLoginRoute() {
  const router = useRouter();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) router.replace('/admin/dashboard');
  }, [user, router]);

  return (
    <AdminLogin
      onLogin={(u, token) => {
        login(u, token);
        router.replace('/admin/dashboard');
      }}
    />
  );
}
