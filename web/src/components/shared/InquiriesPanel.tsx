'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppNotification, Inquiry, WaTemplate } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { MessageCircle, Phone, Users, Calendar, RefreshCw, Trash2, Plus, Bell } from 'lucide-react';

// {ad} {tur} {tarix} {say} placeholder doldurma — server tərəfdəki fillWaTemplate ilə eyni qayda
export function fillWaTemplate(text: string, inquiry: Inquiry): string {
  const vars: Record<string, string> = {
    ad: inquiry.customerName,
    tur: inquiry.tourName || '',
    tarix: inquiry.tourDate || '',
    say: String(inquiry.participantsCount),
  };
  return String(text || '').replace(/\{(ad|tur|tarix|say)\}/g, (_, key) => vars[key] ?? '');
}

// Panel bildirişlərinin oxunmamış sayı — sidebar badge üçün. 60 saniyədən bir yenilənir.
export function useNotificationsBadge(token: string | null | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // şəbəkə xətası — badge köhnə dəyərdə qalır
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
    } catch {
      // növbəti refresh düzəldəcək
    }
  }, [token]);

  return { unreadCount, refresh, markAllRead };
}

// ===================== HEADER ZƏNG BİLDİRİŞLƏRİ =====================

interface NotificationsBellProps {
  token: string | null | undefined;
  // Bildirişə klik — parent müvafiq bölməyə keçir (vendor→CRM, admin→Turlar).
  onOpenItem: (notification: AppNotification) => void;
}

// Social-media stilli bildiriş zəngi: sağ yuxarı headerdə sayğaclı zəng, dropdown-da yalnız
// oxunmamış bildirişlər. İtem-ə klik avtomatik "oxundu" edir (siyahıdan düşür) və yönləndirir.
// Telegram-dakı "✅ Oxundu işarələ" düyməsi də eyni bildirişi oxunmuş edir — 30 san-lıq poll
// növbəti dövrədə onu buradan silir.
export function NotificationsBell({ token, onOpenItem }: NotificationsBellProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setUnread((data.notifications || []).filter((n: AppNotification) => !n.isRead));
    } catch {
      // şəbəkə xətası — köhnə siyahı qalır
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Kənara klik → dropdown bağlanır
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen]);

  const markRead = async (ids: string[]) => {
    if (!token || !ids.length) return;
    setUnread(prev => prev.filter(n => !ids.includes(n.id)));
    try {
      await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // növbəti poll düzəldəcək
    }
  };

  const formatTime = (createdAt: string) => {
    try {
      const d = new Date(createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T') + 'Z');
      const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
      if (mins < 60) return t('inquiriesPanel.bell.minutesAgo', { count: mins });
      if (mins < 60 * 24) return t('inquiriesPanel.bell.hoursAgo', { count: Math.round(mins / 60) });
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const typeEmoji = (type: string) =>
    type === 'inquiry' ? '🔔' : type === 'tour_created' ? '🆕' : type === 'tour_edited' ? '✏️' : '📣';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={t('inquiriesPanel.bell.title')}
        onClick={() => setIsOpen(prev => !prev)}
        className="relative w-11 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[130] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-extrabold text-slate-800">{t('inquiriesPanel.bell.title')}</span>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markRead(unread.map(n => n.id))}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                {t('inquiriesPanel.bell.markAll')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {unread.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 px-4">{t('inquiriesPanel.bell.empty')}</p>
            ) : (
              unread.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markRead([n.id]);
                    setIsOpen(false);
                    onOpenItem(n);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">{typeEmoji(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{n.title}</div>
                      {n.body && <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">{formatTime(n.createdAt)}</div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== HAZIR MESAJLAR EDİTORU =====================

interface WaTemplatesEditorProps {
  templates: WaTemplate[];
  onSave: (templates: WaTemplate[]) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const TEMPLATE_PLACEHOLDERS = ['{ad}', '{tur}', '{tarix}', '{say}'] as const;

export function WaTemplatesEditor({ templates, onSave, onShowNotification }: WaTemplatesEditorProps) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<WaTemplate[]>(templates);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => { setDraft(templates); }, [templates]);

  // Placeholder çipinə klik — tokeni textarea-da kursorun olduğu yerə salır
  const insertPlaceholder = (idx: number, templateId: string, token: string) => {
    const el = textareaRefs.current[templateId];
    const current = draft[idx]?.text ?? '';
    const start = el ? el.selectionStart : current.length;
    const end = el ? el.selectionEnd : current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    setDraft(prev => prev.map((x, i) => (i === idx ? { ...x, text: next } : x)));
    // state yazıldıqdan sonra kursoru tokenin arxasına qaytar
    requestAnimationFrame(() => {
      const node = textareaRefs.current[templateId];
      if (node) {
        node.focus();
        node.selectionStart = node.selectionEnd = start + token.length;
      }
    });
  };

  const handleSave = async () => {
    const cleaned = draft.filter(tp => tp.text.trim());
    setIsSaving(true);
    try {
      await onSave(cleaned);
      if (onShowNotification) onShowNotification(t('inquiriesPanel.templates.saved'), 'success');
    } catch (e: any) {
      if (onShowNotification) onShowNotification(e?.message || t('inquiriesPanel.templates.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" /> {t('inquiriesPanel.templates.title')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{t('inquiriesPanel.templates.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(prev => [...prev, { id: `tpl-${Date.now()}`, name: '', text: '' }])}
          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t('inquiriesPanel.templates.add')}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        💡 {t('inquiriesPanel.templates.placeholdersHint')} <code className="font-mono">{'{ad}'}</code>, <code className="font-mono">{'{tur}'}</code>, <code className="font-mono">{'{tarix}'}</code>, <code className="font-mono">{'{say}'}</code>
      </p>

      {draft.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">{t('inquiriesPanel.templates.empty')}</p>
      )}

      <div className="space-y-3">
        {draft.map((tp, idx) => (
          <div key={tp.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tp.name}
                onChange={(e) => setDraft(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                placeholder={t('inquiriesPanel.templates.namePlaceholder')}
                className="flex-1 min-w-0 px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setDraft(prev => prev.filter((_, i) => i !== idx))}
                className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
                aria-label={t('inquiriesPanel.templates.remove')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              ref={(el) => { textareaRefs.current[tp.id] = el; }}
              value={tp.text}
              onChange={(e) => setDraft(prev => prev.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))}
              placeholder={t('inquiriesPanel.templates.textPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
            />
            {/* Klik-lə mətnə əlavə olunan hazır placeholder çipləri */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">{t('inquiriesPanel.templates.insertHint')}</span>
              {TEMPLATE_PLACEHOLDERS.map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertPlaceholder(idx, tp.id, token)}
                  className="text-[11px] font-mono font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md cursor-pointer transition"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? t('inquiriesPanel.templates.saving') : t('inquiriesPanel.templates.save')}
        </button>
      </div>
    </div>
  );
}

// ===================== SORĞULAR SİYAHISI =====================

interface InquiriesPanelProps {
  token: string | null | undefined;
  waTemplates: WaTemplate[]; // sürətli WhatsApp cavab düymələri üçün
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export function InquiriesPanel({ token, waTemplates, onShowNotification }: InquiriesPanelProps) {
  const { t } = useLanguage();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/inquiries', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setInquiries(data.inquiries || []);
    } catch {
      if (onShowNotification) onShowNotification(t('inquiriesPanel.list.loadError'), 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const updateStatus = async (inquiry: Inquiry, status: Inquiry['status']) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInquiries(prev => prev.map(i => i.id === inquiry.id ? { ...i, status } : i));
      }
    } catch {
      if (onShowNotification) onShowNotification(t('inquiriesPanel.list.statusError'), 'error');
    }
  };

  const statusPill = (status: Inquiry['status']) => {
    const map = {
      new: 'bg-red-50 text-red-600 border-red-200',
      read: 'bg-sky-50 text-sky-700 border-sky-200',
      replied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    } as const;
    return (
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${map[status]}`}>
        {t(`inquiriesPanel.status.${status}`)}
      </span>
    );
  };

  const waLink = (inquiry: Inquiry, text: string) =>
    `https://wa.me/${inquiry.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-slate-800 text-sm">{t('inquiriesPanel.list.title', { count: inquiries.length })}</h3>
        <button
          type="button"
          onClick={() => { setIsLoading(true); load(); }}
          className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t('inquiriesPanel.list.refresh')}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          {t('inquiriesPanel.list.loading')}
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-1">
          <p className="text-sm font-bold text-slate-500">{t('inquiriesPanel.list.emptyTitle')}</p>
          <p className="text-xs text-slate-400">{t('inquiriesPanel.list.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inquiry => (
            <div key={inquiry.id} className={`bg-white rounded-2xl border p-4 space-y-3 ${inquiry.status === 'new' ? 'border-red-200 shadow-sm' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-800 text-sm">{inquiry.customerName}</span>
                    {statusPill(inquiry.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {inquiry.customerPhone}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t('inquiriesPanel.list.participants', { count: inquiry.participantsCount })}</span>
                    {inquiry.tourDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {inquiry.tourDate}</span>}
                  </div>
                  <div className="text-xs font-bold text-emerald-700">{inquiry.tourName}</div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {inquiry.createdAt ? new Date(inquiry.createdAt.replace(' ', 'T') + 'Z').toLocaleString() : ''}
                </span>
              </div>

              {inquiry.answers.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                  {inquiry.answers.map((a, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-slate-500">{a.question}</span>{' '}
                      <span className="font-bold text-slate-800">{a.answer}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {/* WhatsApp cavab düymələri — hazır şablonlar (yoxdursa boş mesajla aç) */}
                {(waTemplates.length ? waTemplates : [{ id: 'default', name: t('inquiriesPanel.list.replyOnWhatsapp'), text: '' }]).slice(0, 4).map(tp => (
                  <a
                    key={tp.id}
                    href={waLink(inquiry, fillWaTemplate(tp.text, inquiry))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { if (inquiry.status === 'new') updateStatus(inquiry, 'read'); }}
                    className="bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-[11px] font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition no-underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    {tp.name || t('inquiriesPanel.list.replyOnWhatsapp')}
                  </a>
                ))}

                <div className="ml-auto flex items-center gap-1.5">
                  {inquiry.status !== 'read' && inquiry.status !== 'replied' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(inquiry, 'read')}
                      className="text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      {t('inquiriesPanel.list.markRead')}
                    </button>
                  )}
                  {inquiry.status !== 'replied' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(inquiry, 'replied')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      {t('inquiriesPanel.list.markReplied')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
