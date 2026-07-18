'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import VendorPortal from '@/components/VendorPortal';
import { useAuth } from '@/lib/auth';
import { useNotification } from '@/lib/notification';
import { useMarketplace } from '@/hooks/useMarketplace';

export default function VendorDashboardRoute() {
  const router = useRouter();
  const { user, token, ready, logout, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const mp = useMarketplace(token);

  // No stored session once hydration finished → bounce to login. (The session persists to
  // localStorage, so a hard refresh only logs you out if there was nothing stored.)
  useEffect(() => {
    if (ready && !user) router.replace('/vendor/login');
  }, [ready, user, router]);

  if (!user) return null;

  if (mp.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <VendorPortal
      tours={mp.tours}
      slots={mp.slots}
      bookings={mp.bookings}
      currentUser={user}
      operatorToken={token}
      onAddSlot={mp.handleAddSlot}
      onDeleteSlot={mp.handleDeleteSlot}
      onUpdateSlot={mp.handleUpdateSlot}
      onAddTour={mp.handleAddTour}
      onEditTour={mp.handleEditTour}
      onDeleteTour={mp.handleDeleteTour}
      onShowNotification={showNotification}
      onApproveBooking={mp.handleApproveBooking}
      onEditBooking={mp.handleEditBooking}
      onDeleteBooking={mp.handleDeleteBooking}
      onAddBooking={mp.handleAddBooking}
      onUpdateSlotBookedCount={mp.handleUpdateSlotBookedCount}
      exchangeRates={mp.exchangeRates}
      onUpdateExchangeRates={mp.handleUpdateExchangeRates}
      onToggleFeatured={mp.handleToggleFeatured}
      onUserUpdated={(updatedUser) => {
        mp.handleVendorProfileUpdated(updatedUser);
        // Also merge into the auth session (and its stored copy) — `currentUser` comes from
        // there, so without this a vendor's own profile edits save but never show up until
        // they log out and back in.
        updateUser(updatedUser);
      }}
      onLogout={() => {
        logout();
        router.replace('/vendor/login');
      }}
    />
  );
}
