'use client';
import { useState, type ReactNode } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number; // e.g. unread notifications — hidden when 0/undefined
}

interface DashboardSidebarLayoutProps {
  wordmark: string;
  subtitle: string;
  navItems: DashboardNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export default function DashboardSidebarLayout({
  wordmark,
  subtitle,
  navItems,
  activeId,
  onSelect,
  title,
  rightSlot,
  children,
}: DashboardSidebarLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navList = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map(({ id, label, icon: Icon, badgeCount }) => {
        const isActive = id === activeId;
        return (
          <button
            key={id}
            onClick={() => {
              onSelect(id);
              setIsMobileNavOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isActive
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-white/85 hover:bg-black/10'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-left flex-1">{label}</span>
            {!!badgeCount && (
              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-brand-bg-light">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-brand-primary min-h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="font-black text-white leading-tight text-lg tracking-tight">{wordmark}</div>
          <div className="text-[11px] uppercase tracking-widest text-white/60 font-bold mt-0.5">{subtitle}</div>
        </div>
        {navList}
      </aside>

      {/* Mobile drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-brand-primary h-full animate-fadeIn">
            <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="font-black text-white leading-tight text-lg tracking-tight">{wordmark}</div>
                <div className="text-[11px] uppercase tracking-widest text-white/60 font-bold mt-0.5">{subtitle}</div>
              </div>
              <button onClick={() => setIsMobileNavOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navList}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 md:h-20 bg-white border-b border-border-primary flex items-center justify-between px-4 md:px-8 gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden text-brand-text-main cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-base md:text-lg font-bold text-brand-text-main truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">{rightSlot}</div>
        </header>

        <main className="flex-1 p-4 md:p-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}