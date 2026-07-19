'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { X, Plus, Send, KeyRound, CalendarClock } from 'lucide-react';

interface AdminVendorEditModalProps {
  vendor: User | null; // null = bağlı
  onClose: () => void;
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Vendor üzrə BÜTÜN admin düzəlişləri bir yerdə — vendor sətrindəki "Düzəliş et" düyməsi
// bu modalı açır: giriş məlumatları (login/parol), abunəlik, aktiv/deaktiv, Telegram chat
// ID-ləri. Ayrı-ayrı kartlara səpələnmiş köhnə idarəetmənin əvəzidir.
export default function AdminVendorEditModal({ vendor, onClose, onUpdateUser, onShowNotification }: AdminVendorEditModalProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newChatId, setNewChatId] = useState('');

  useEffect(() => {
    if (vendor) {
      setUsername(vendor.username || vendor.email);
      // Real parol geri oxunmur (hash-lənib) — admin yalnız yeni parol yaza bilər
      setPassword('');
      setNewChatId('');
    }
  }, [vendor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!vendor) return null;

  const subDate = vendor.subscriptionValidUntil ? new Date(vendor.subscriptionValidUntil) : null;

  const saveCredentials = () => {
    if (!onUpdateUser) return;
    if (!username.trim()) {
      if (onShowNotification) onShowNotification(t('adminPortal.loginCredentials.emptyFieldsError'), 'error');
      return;
    }
    const payload: Partial<User> = { username: username.trim() };
    if (password) payload.password = password;
    onUpdateUser(vendor.id, payload);
    setPassword('');
    if (onShowNotification) onShowNotification(t('adminPortal.loginCredentials.updateSuccess'), 'success');
  };

  const addChatId = () => {
    const id = newChatId.trim();
    if (!id || !onUpdateUser) return;
    onUpdateUser(vendor.id, { telegramChatIds: [...new Set([...(vendor.telegramChatIds || []), id])] });
    setNewChatId('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/50 flex items-end sm:items-center sm:justify-center animate-sheet-backdrop-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-sheet-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <span className="font-extrabold text-slate-900 text-base block">{t('inquiriesPanel.vendorEdit.title')}</span>
            <span className="text-xs text-slate-500">{vendor.name}{vendor.companyName ? ` • ${vendor.companyName}` : ''}</span>
          </div>
          <button
            type="button"
            aria-label={t('inquiriesPanel.vendorEdit.close')}
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5">
          {/* Giriş məlumatları */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-700" /> {t('adminPortal.loginCredentials.title')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('adminPortal.loginCredentials.usernamePlaceholder')}
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('adminPortal.loginCredentials.newPasswordPlaceholder')}
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={saveCredentials}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition cursor-pointer"
            >
              {t('inquiriesPanel.vendorEdit.saveCredentials')}
            </button>
          </div>

          {/* Abunəlik */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-emerald-700" /> {t('adminPortal.subscriptions.title')}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                className="p-2 border border-slate-300 rounded-lg text-xs bg-white"
                value={subDate ? subDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (onUpdateUser) {
                    onUpdateUser(vendor.id, { subscriptionValidUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined });
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (onUpdateUser) {
                    const newDate = new Date();
                    newDate.setMonth(newDate.getMonth() + 1);
                    onUpdateUser(vendor.id, { subscriptionValidUntil: newDate.toISOString() });
                    if (onShowNotification) onShowNotification(t('adminPortal.subscriptions.extendSuccess', { name: vendor.name }), 'success');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2.5 rounded-lg text-xs transition cursor-pointer"
              >
                {t('adminPortal.subscriptions.extendOneMonth')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateUser) {
                    const next = !vendor.isManuallyDeactivated;
                    onUpdateUser(vendor.id, { isManuallyDeactivated: next });
                    if (onShowNotification) {
                      onShowNotification(
                        next
                          ? t('adminPortal.subscriptions.deactivateSuccess', { name: vendor.name })
                          : t('adminPortal.subscriptions.reactivateSuccess', { name: vendor.name }),
                        'success'
                      );
                    }
                  }
                }}
                className={`font-bold px-3 py-2.5 rounded-lg text-xs transition border cursor-pointer ${
                  vendor.isManuallyDeactivated
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                }`}
              >
                {vendor.isManuallyDeactivated ? t('adminPortal.subscriptions.activate') : t('adminPortal.subscriptions.deactivate')}
              </button>
            </div>
          </div>

          {/* Telegram chat ID-ləri */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-700" /> {t('inquiriesPanel.vendorEdit.telegramTitle')}
            </h4>
            <p className="text-[10px] text-slate-500">
              {t('inquiriesPanel.vendorTelegram.description', { bot: '@AzTour_booking_bot' })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(vendor.telegramChatIds || []).map(id => (
                <span key={id} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-lg">
                  {id}
                  <button
                    type="button"
                    onClick={() => onUpdateUser && onUpdateUser(vendor.id, { telegramChatIds: (vendor.telegramChatIds || []).filter(x => x !== id) })}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                    aria-label={t('inquiriesPanel.vendorTelegram.remove')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {(vendor.telegramChatIds || []).length === 0 && (
                <span className="text-[11px] text-slate-400">{t('inquiriesPanel.telegram.vendorNoChats')}</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChatId(); } }}
                placeholder={t('inquiriesPanel.telegram.chatIdPlaceholder')}
                className="flex-1 min-w-0 max-w-[220px] px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={!newChatId.trim()}
                onClick={addChatId}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('inquiriesPanel.telegram.addChatId')}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-lg transition cursor-pointer"
          >
            {t('inquiriesPanel.vendorEdit.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
