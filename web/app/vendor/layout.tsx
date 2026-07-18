'use client';

import { AuthProvider, VENDOR_SESSION_KEY } from '@/lib/auth';

// The AuthProvider lives here (route-group layout) so the operator session (persisted to localStorage) survives
// navigation between /vendor/login and /vendor/dashboard. No site chrome — the dashboard has
// its own sidebar/topbar; the login screen is standalone.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider storageKey={VENDOR_SESSION_KEY}>{children}</AuthProvider>;
}
