'use client';
import React, { useState } from 'react';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Send, Plus, X } from 'lucide-react';

interface AdminVendorTelegramProps {
  vendors: User[];
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Vendor başına Telegram chat ID-lərinin bağlanması (bir vendora bir neçə chat ola bilər).
// ID-ni vendor bota /start yazaraq öyrənir, admin isə burada hesabına əlavə edir.
export default function AdminVendorTelegram({ vendors, onUpdateUser, onShowNotification }: AdminVendorTelegramProps) {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const addChatId = (vendor: User) => {
    const id = (drafts[vendor.id] || '').trim();
    if (!id || !onUpdateUser) return;
    const next = [...new Set([...(vendor.telegramChatIds || []), id])];
    onUpdateUser(vendor.id, { telegramChatIds: next });
    setDrafts(prev => ({ ...prev, [vendor.id]: '' }));
    if (onShowNotification) onShowNotification(t('inquiriesPanel.vendorTelegram.added', { name: vendor.name }), 'success');
  };

  const removeChatId = (vendor: User, id: string) => {
    if (!onUpdateUser) return;
    onUpdateUser(vendor.id, { telegramChatIds: (vendor.telegramChatIds || []).filter(x => x !== id) });
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
      <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
        <Send className="w-4 h-4 text-emerald-700" />
        {t('inquiriesPanel.vendorTelegram.title')}
      </h3>
      <p className="text-[10px] text-slate-500 mb-2">
        {t('inquiriesPanel.vendorTelegram.description', { bot: '@AzTour_booking_bot' })}
      </p>
      <div className="space-y-3">
        {vendors.filter(u => u.role === 'vendor' && !u.isArchived).map(vendor => (
          <div key={vendor.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong className="text-slate-900 block">{vendor.name}</strong>
                <span className="text-[10px] text-slate-500">{vendor.companyName || ''}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {t('inquiriesPanel.vendorTelegram.chatCount', { count: (vendor.telegramChatIds || []).length })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(vendor.telegramChatIds || []).map(id => (
                <span key={id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-mono font-bold px-2 py-1 rounded-lg">
                  {id}
                  <button
                    type="button"
                    onClick={() => removeChatId(vendor, id)}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                    aria-label={t('inquiriesPanel.vendorTelegram.remove')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={drafts[vendor.id] || ''}
                onChange={(e) => setDrafts(prev => ({ ...prev, [vendor.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChatId(vendor); } }}
                placeholder={t('inquiriesPanel.telegram.chatIdPlaceholder')}
                className="w-36 px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={!(drafts[vendor.id] || '').trim()}
                onClick={() => addChatId(vendor)}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {t('inquiriesPanel.telegram.addChatId')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
