'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'info' | 'error' | 'warning';

interface NotificationContextValue {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  showNotification: () => {},
});

/** App-wide toast (lifted out of the old App.tsx) so any ported component can call
 *  onShowNotification without a browser alert(). Lives in a Context so it spans routes. */
export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(
    null,
  );

  const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 border p-4 rounded-xl shadow-2xl max-w-sm transition-all ${
            notification.type === 'success'
              ? 'bg-slate-900 border-emerald-800 text-slate-100'
              : notification.type === 'error'
                ? 'bg-slate-900 border-rose-800 text-slate-100'
                : notification.type === 'warning'
                  ? 'bg-slate-900 border-amber-800 text-slate-100'
                  : 'bg-slate-900 border-sky-800 text-slate-100'
          }`}
          role="status"
        >
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
