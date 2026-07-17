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
  const { user, token, logout } = useAuth();
  const { showNotification } = useNotification();
  const mp = useMarketplace(token);

  // Hard refresh clears the in-memory token → bounce to login.
  useEffect(() => {
    if (!user) router.replace('/vendor/login');
  }, [user, router]);

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
      onUserUpdated={mp.handleVendorProfileUpdated}
      onLogout={() => {
        logout();
        router.replace('/vendor/login');
      }}
    />
  );
}
