import React, { useEffect, useState } from 'react';
import { User, VendorBus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Calculator, Truck } from 'lucide-react';

interface AdminVendorCalculatorProps {
  vendors: User[];
  authToken?: string | null;
  onUpdateUser?: (userId: string, data: Partial<User>) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Admin "Vendors" section widget: per-vendor toggles for the calculator/bus-tracking features,
// and a read-only view of vendor-entered bus records. The rate numbers themselves (day rates,
// offroad/food unit prices) are self-service — vendors tune and save their own from the
// Kalkulyator tab (see CalculatorTab.tsx) — admin only controls whether the tab exists at all.
export default function AdminVendorCalculator({ vendors, authToken, onUpdateUser, onShowNotification }: AdminVendorCalculatorProps) {
  const { t } = useLanguage();
  const [selectedBusVendorId, setSelectedBusVendorId] = useState<string>('');
  const [busRecords, setBusRecords] = useState<VendorBus[]>([]);
  const [busLoading, setBusLoading] = useState(false);

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  useEffect(() => {
    if (!selectedBusVendorId) { setBusRecords([]); return; }
    setBusLoading(true);
    fetch(`/api/vendor-buses?vendorId=${encodeURIComponent(selectedBusVendorId)}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => setBusRecords(Array.isArray(data.buses) ? data.buses : []))
      .catch(() => setBusRecords([]))
      .finally(() => setBusLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusVendorId, authToken]);

  const handleToggle = (vendor: User, field: 'calculatorEnabled' | 'busTrackingEnabled') => {
    if (!onUpdateUser) return;
    const next = !vendor[field];
    onUpdateUser(vendor.id, { [field]: next } as Partial<User>);
    if (onShowNotification) {
      const key = field === 'calculatorEnabled'
        ? (next ? 'adminVendorTools.toggleSuccess.calculatorEnabled' : 'adminVendorTools.toggleSuccess.calculatorDisabled')
        : (next ? 'adminVendorTools.toggleSuccess.busTrackingEnabled' : 'adminVendorTools.toggleSuccess.busTrackingDisabled');
      onShowNotification(t(key, { name: vendor.name }), 'success');
    }
  };

  const activeVendors = vendors.filter(v => v.role === 'vendor' && !v.isArchived);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
      <h3 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
        <Calculator className="w-4 h-4 text-emerald-700" />
        {t('adminVendorTools.section.title')}
      </h3>
      <p className="text-[10px] text-slate-500 mb-2">{t('adminVendorTools.section.description')}</p>

      <div className="space-y-3">
        {activeVendors.map(vendor => (
          <div key={vendor.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <strong className="text-slate-900 block">{vendor.name}</strong>
                <span className="text-[10px] text-slate-500">{vendor.companyName || ''}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">{t('adminVendorTools.vendorRow.calculatorLabel')}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(vendor, 'calculatorEnabled')}
                  className={`font-bold min-h-[36px] px-3 flex items-center justify-center rounded text-xs transition border ${
                    vendor.calculatorEnabled
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {vendor.calculatorEnabled ? t('adminVendorTools.vendorRow.enabledBadge') : t('adminVendorTools.vendorRow.disabledBadge')}
                </button>

                <span className="text-[10px] font-bold text-slate-400 ml-2">{t('adminVendorTools.vendorRow.busTrackingLabel')}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(vendor, 'busTrackingEnabled')}
                  className={`font-bold min-h-[36px] px-3 flex items-center justify-center rounded text-xs transition border ${
                    vendor.busTrackingEnabled
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {vendor.busTrackingEnabled ? t('adminVendorTools.vendorRow.enabledBadge') : t('adminVendorTools.vendorRow.disabledBadge')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <h4 className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
          <Truck className="w-4 h-4 text-emerald-700" />
          {t('adminVendorTools.busRecords.title')}
        </h4>
        <label className="block text-[10px] font-bold text-slate-400 mb-1">{t('adminVendorTools.busRecords.selectVendorLabel')}</label>
        <select
          value={selectedBusVendorId}
          onChange={(e) => setSelectedBusVendorId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-3"
        >
          <option value="">{t('adminVendorTools.busRecords.selectVendorPlaceholder')}</option>
          {activeVendors.map(v => (
            <option key={v.id} value={v.id}>{v.companyName || v.name}</option>
          ))}
        </select>

        {selectedBusVendorId && (
          busLoading ? (
            <p className="text-[10px] text-slate-400">…</p>
          ) : busRecords.length === 0 ? (
            <p className="text-[10px] text-slate-400">{t('adminVendorTools.busRecords.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-400 border-b border-slate-200">
                    <th className="py-1.5 pr-2">{t('adminVendorTools.busRecords.headers.tour')}</th>
                    <th className="py-1.5 pr-2">{t('adminVendorTools.busRecords.headers.contactPhone')}</th>
                    <th className="py-1.5 pr-2">{t('adminVendorTools.busRecords.headers.description')}</th>
                    <th className="py-1.5 pr-2">{t('adminVendorTools.busRecords.headers.price')}</th>
                    <th className="py-1.5 pr-2">{t('adminVendorTools.busRecords.headers.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {busRecords.map(bus => (
                    <tr key={bus.id} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2">{bus.tourName}</td>
                      <td className="py-1.5 pr-2 font-bold">{bus.contactPhone}</td>
                      <td className="py-1.5 pr-2">{bus.vehicleDescription || '—'}</td>
                      <td className="py-1.5 pr-2">{bus.price} AZN</td>
                      <td className="py-1.5 pr-2">{bus.travelDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
