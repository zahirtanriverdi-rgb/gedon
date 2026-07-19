'use client';
import React, { useEffect, useState } from 'react';
import { WaTemplate } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { InquiriesPanel, WaTemplatesEditor } from '../shared/InquiriesPanel';
import { Plus, X } from 'lucide-react';

interface AdminInquiriesTabProps {
  authToken: string | null | undefined;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Admin "Bildirişlər" bölməsi: bütün rezervasiya sorğuları + adminin öz Telegram chat ID-ləri
// və "Hazır mesajlar" şablonları (GET/PUT /api/admin/telegram-settings).
export default function AdminInquiriesTab({ authToken, onShowNotification }: AdminInquiriesTabProps) {
  const { t } = useLanguage();
  const [botEnabled, setBotEnabled] = useState<boolean | null>(null);
  const [adminChatIds, setAdminChatIds] = useState<string[]>([]);
  const [newChatId, setNewChatId] = useState('');
  const [adminTemplates, setAdminTemplates] = useState<WaTemplate[]>([]);
  const [isSavingChatIds, setIsSavingChatIds] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/telegram-settings', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) return;
        const data = await res.json();
        setBotEnabled(!!data.botEnabled);
        setAdminChatIds(data.adminChatIds || []);
        setAdminTemplates(data.adminTemplates || []);
      } catch {
        // sorğular paneli yenə işləyir — telegram parametrləri sonra yüklənər
      }
    })();
  }, [authToken]);

  const saveSettings = async (patch: { adminChatIds?: string[]; adminTemplates?: WaTemplate[] }) => {
    const res = await fetch('/api/admin/telegram-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || t('inquiriesPanel.telegram.saveError'));
    setAdminChatIds(data.adminChatIds || []);
    setAdminTemplates(data.adminTemplates || []);
  };

  const handleSaveChatIds = async (ids: string[]) => {
    setIsSavingChatIds(true);
    try {
      await saveSettings({ adminChatIds: ids });
      if (onShowNotification) onShowNotification(t('inquiriesPanel.telegram.saved'), 'success');
    } catch (e: any) {
      if (onShowNotification) onShowNotification(e?.message || t('inquiriesPanel.telegram.saveError'), 'error');
    } finally {
      setIsSavingChatIds(false);
    }
  };

  return (
    <div className="space-y-5">
      <InquiriesPanel token={authToken} waTemplates={adminTemplates} onShowNotification={onShowNotification} />

      {/* Admin chat ID-ləri */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">✈️ {t('inquiriesPanel.telegram.adminSettingsTitle')}</h3>
        <p className={`text-[11px] font-bold ${botEnabled === false ? 'text-red-600' : 'text-emerald-700'}`}>
          {botEnabled === false ? t('inquiriesPanel.telegram.botDisabled') : t('inquiriesPanel.telegram.botEnabled')}
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('inquiriesPanel.telegram.adminChatIdsLabel')}</label>
          <p className="text-[10px] text-slate-400 mb-2">{t('inquiriesPanel.telegram.adminChatIdsHint')}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {adminChatIds.map(id => (
              <span key={id} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg">
                {id}
                <button
                  type="button"
                  disabled={isSavingChatIds}
                  onClick={() => handleSaveChatIds(adminChatIds.filter(x => x !== id))}
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
              placeholder={t('inquiriesPanel.telegram.chatIdPlaceholder')}
              className="flex-1 min-w-0 max-w-xs px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              disabled={isSavingChatIds || !newChatId.trim()}
              onClick={() => {
                const id = newChatId.trim();
                if (!id) return;
                handleSaveChatIds([...new Set([...adminChatIds, id])]);
                setNewChatId('');
              }}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {t('inquiriesPanel.telegram.addChatId')}
            </button>
          </div>
        </div>
      </div>

      {/* Adminin öz hazır mesajları */}
      <WaTemplatesEditor
        templates={adminTemplates}
        onShowNotification={onShowNotification}
        onSave={async (templates) => { await saveSettings({ adminTemplates: templates }); }}
      />
    </div>
  );
}
