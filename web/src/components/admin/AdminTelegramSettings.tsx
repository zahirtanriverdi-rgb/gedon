'use client';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Send, Plus, X } from 'lucide-react';

interface AdminTelegramSettingsProps {
  authToken: string | null | undefined;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Ayarlar bölməsindəki Telegram kartı — adminin öz chat ID-ləri. Bu chat-lərə vendor
// hadisələri (yeni tur / tur düzəlişi, təsdiq gözləyən) bildiriş kimi gedir.
export default function AdminTelegramSettings({ authToken, onShowNotification }: AdminTelegramSettingsProps) {
  const { t } = useLanguage();
  const [botEnabled, setBotEnabled] = useState<boolean | null>(null);
  const [adminChatIds, setAdminChatIds] = useState<string[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/telegram-settings', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) return;
        const data = await res.json();
        setBotEnabled(!!data.botEnabled);
        setAdminChatIds(data.adminChatIds || []);
      } catch {
        // kart sadəcə boş qalır — digər ayarlar işləməyə davam edir
      }
    })();
  }, [authToken]);

  const saveChatIds = async (ids: string[]) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/telegram-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ adminChatIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('inquiriesPanel.telegram.saveError'));
      setAdminChatIds(data.adminChatIds || []);
      if (onShowNotification) onShowNotification(t('inquiriesPanel.telegram.saved'), 'success');
    } catch (e: any) {
      if (onShowNotification) onShowNotification(e?.message || t('inquiriesPanel.telegram.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
      <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
        <Send className="w-4 h-4 text-emerald-700" />
        {t('inquiriesPanel.telegram.adminSettingsTitle')}
      </h3>
      <p className={`text-[11px] font-bold ${botEnabled === false ? 'text-red-600' : 'text-emerald-700'}`}>
        {botEnabled === false ? t('inquiriesPanel.telegram.botDisabled') : t('inquiriesPanel.telegram.botEnabled')}
      </p>
      <p className="text-[10px] text-slate-500">{t('inquiriesPanel.telegram.adminChatIdsHintTourEvents')}</p>
      <div className="flex flex-wrap gap-2">
        {adminChatIds.map(id => (
          <span key={id} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg">
            {id}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => saveChatIds(adminChatIds.filter(x => x !== id))}
              className="text-slate-400 hover:text-red-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newChatId}
          onChange={(e) => setNewChatId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newChatId.trim()) { saveChatIds([...new Set([...adminChatIds, newChatId.trim()])]); setNewChatId(''); } } }}
          placeholder={t('inquiriesPanel.telegram.chatIdPlaceholder')}
          className="flex-1 min-w-0 max-w-xs px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="button"
          disabled={isSaving || !newChatId.trim()}
          onClick={() => { saveChatIds([...new Set([...adminChatIds, newChatId.trim()])]); setNewChatId(''); }}
          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t('inquiriesPanel.telegram.addChatId')}
        </button>
      </div>
    </div>
  );
}
