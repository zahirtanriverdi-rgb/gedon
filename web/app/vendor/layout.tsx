'use client';

import { AuthProvider } from '@/lib/auth';

// The AuthProvider lives here (route-group layout) so the in-memory operator token survives
// navigation between /vendor/login and /vendor/dashboard. No site chrome — the dashboard has
// its own sidebar/topbar; the login screen is standalone.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
