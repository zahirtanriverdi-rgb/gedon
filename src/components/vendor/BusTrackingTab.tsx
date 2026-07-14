import React, { useEffect, useState } from 'react';
import { Tour, User, VendorBus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Bus, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface BusTrackingTabProps {
  tours: Tour[];
  currentUser: User;
  operatorToken?: string | null;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

interface BusFormState {
  tourId: string;
  busName: string;
  price: number | '';
  travelDate: string;
}

const emptyForm: BusFormState = { tourId: '', busName: '', price: '', travelDate: '' };

export function BusTrackingTab({ tours, currentUser, operatorToken, onShowNotification }: BusTrackingTabProps) {
  const { t } = useLanguage();
  const [buses, setBuses] = useState<VendorBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BusFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const myTours = tours.filter(tr => tr.vendorId === currentUser.id);

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
  };

  const loadBuses = () => {
    setLoading(true);
    fetch('/api/vendor-buses', { headers: authHeaders })
      .then(res => res.json())
      .then(data => setBuses(Array.isArray(data.buses) ? data.buses : []))
      .catch(() => setBuses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorToken]);

  if (!currentUser.busTrackingEnabled) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
        <h3 className="text-base font-bold text-slate-800">{t('vendorBusTracking.disabled.title')}</h3>
        <p className="text-sm text-slate-500">{t('vendorBusTracking.disabled.description')}</p>
      </div>
    );
  }

  const startAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (bus: VendorBus) => {
    setForm({ tourId: bus.tourId || '', busName: bus.busName, price: bus.price, travelDate: bus.travelDate });
    setEditingId(bus.id);
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const tourName = myTours.find(tr => tr.id === form.tourId)?.name || '';
    if (!tourName || !form.busName || form.price === '' || !form.travelDate) {
      if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.missingFields'), 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = { tourId: form.tourId || undefined, tourName, busName: form.busName, price: Number(form.price), travelDate: form.travelDate };
      const url = editingId ? `/api/vendor-buses/${editingId}` : '/api/vendor-buses';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'error');

      if (editingId) {
        setBuses(prev => prev.map(b => b.id === editingId ? data.bus : b));
        if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.updateSuccess'), 'success');
      } else {
        setBuses(prev => [data.bus, ...prev]);
        if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.addSuccess'), 'success');
      }
      cancelForm();
    } catch {
      if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bus: VendorBus) => {
    const confirmed = window.confirm(t('vendorBusTracking.table.deleteConfirm'));
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/vendor-buses/${bus.id}`, { method: 'DELETE', headers: authHeaders });
      if (!response.ok) throw new Error();
      setBuses(prev => prev.filter(b => b.id !== bus.id));
      if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.deleteSuccess'), 'success');
    } catch {
      if (onShowNotification) onShowNotification(t('vendorBusTracking.notifications.error'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bus className="w-4 h-4 text-emerald-700" />
              {t('vendorBusTracking.header.title')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('vendorBusTracking.header.subtitle')}</p>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={startAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              {t('vendorBusTracking.addButton')}
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400">{t('vendorBusTracking.form.tourLabel')}</label>
              <select
                value={form.tourId}
                onChange={(e) => setForm(f => ({ ...f, tourId: e.target.value }))}
                className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl"
              >
                <option value="">{t('vendorBusTracking.form.tourPlaceholder')}</option>
                {myTours.map(tr => (
                  <option key={tr.id} value={tr.id}>{tr.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400">{t('vendorBusTracking.form.busNameLabel')}</label>
              <input
                type="text"
                value={form.busName}
                onChange={(e) => setForm(f => ({ ...f, busName: e.target.value }))}
                placeholder={t('vendorBusTracking.form.busNamePlaceholder')}
                className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400">{t('vendorBusTracking.form.priceLabel')}</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400">{t('vendorBusTracking.form.dateLabel')}</label>
              <input
                type="date"
                value={form.travelDate}
                onChange={(e) => setForm(f => ({ ...f, travelDate: e.target.value }))}
                className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl"
              />
            </div>
            <div className="md:col-span-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelForm}
                className="text-xs font-bold px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                {t('vendorBusTracking.form.cancelButton')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="text-xs font-bold px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {t('vendorBusTracking.form.saveButton')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        {loading ? (
          <p className="text-xs text-slate-400">…</p>
        ) : buses.length === 0 ? (
          <p className="text-xs text-slate-400">{t('vendorBusTracking.table.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-3">{t('vendorBusTracking.table.headers.tour')}</th>
                  <th className="py-2 pr-3">{t('vendorBusTracking.table.headers.bus')}</th>
                  <th className="py-2 pr-3">{t('vendorBusTracking.table.headers.price')}</th>
                  <th className="py-2 pr-3">{t('vendorBusTracking.table.headers.date')}</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {buses.map(bus => (
                  <tr key={bus.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-700">{bus.tourName}</td>
                    <td className="py-2 pr-3">{bus.busName}</td>
                    <td className="py-2 pr-3">{bus.price} AZN</td>
                    <td className="py-2 pr-3">{bus.travelDate}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => startEdit(bus)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title={t('vendorBusTracking.table.editButton')}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(bus)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600" title={t('vendorBusTracking.table.deleteButton')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
