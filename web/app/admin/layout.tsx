'use client';

import { AuthProvider, ADMIN_SESSION_KEY } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider storageKey={ADMIN_SESSION_KEY}>{children}</AuthProvider>;
}
