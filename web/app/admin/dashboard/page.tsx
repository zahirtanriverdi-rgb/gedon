'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import AdminPortal from '@/components/AdminPortal';
import { useAuth } from '@/lib/auth';
import { useNotification } from '@/lib/notification';
import { useMarketplace } from '@/hooks/useMarketplace';

export default function AdminDashboardRoute() {
  const router = useRouter();
  const { user, token, ready, logout } = useAuth();
  const { showNotification } = useNotification();
  const mp = useMarketplace(token);

  useEffect(() => {
    if (ready && !user) router.replace('/admin/login');
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
    <AdminPortal
      tours={mp.tours}
      slots={mp.slots}
      bookings={mp.bookings}
      users={mp.users}
      currentUser={user}
      platformConfig={mp.platformConfig}
      onUpdatePriceCalculatorConfig={mp.handleUpdatePriceCalculatorConfig}
      onApproveTour={mp.handleApproveTour}
      onRejectTour={mp.handleRejectTour}
      onEditTour={mp.handleEditTour}
      onDeleteTour={mp.handleDeleteTour}
      onAddSlot={mp.handleAddSlot}
      onDeleteSlot={mp.handleDeleteSlot}
      onUpdateSlot={mp.handleUpdateSlot}
      onShowNotification={showNotification}
      exchangeRates={mp.exchangeRates}
      onUpdateExchangeRates={mp.handleUpdateExchangeRates}
      onUpdateUser={mp.handleUpdateUser}
      onCreateVendor={mp.handleCreateVendor}
      onDeleteVendor={mp.handleDeleteVendor}
      onUpdateTourStatus={mp.handleUpdateTourStatus}
      authToken={token}
      onLogout={() => {
        logout();
        router.replace('/admin/login');
      }}
    />
  );
}
