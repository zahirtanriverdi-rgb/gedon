import { useState } from 'react';
import { Trash } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TourDangerZoneProps {
  isActive: boolean;
  onToggleActive: () => void;
  onDelete: () => Promise<void>;
}

// Only rendered in edit mode (never on create) — status toggle + a double-confirmation
// delete flow so a single mis-click can't wipe out a tour.
export function TourDangerZone({ isActive, onToggleActive, onDelete }: TourDangerZoneProps) {
  const { t } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <h4 className="text-[10px] font-extrabold text-red-700 tracking-widest flex items-center gap-1">⚠️ {t('vendorMisc.tourDangerZone.title')}</h4>
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        {/* Status Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="block font-extrabold text-slate-850 text-xs">{t('vendorMisc.tourDangerZone.activeToggleLabel')}</span>
            <span className="block text-[10px] text-slate-500 font-medium">{t('vendorMisc.tourDangerZone.activeToggleDescription')}</span>
          </div>
          <div>
            <button
              type="button"
              onClick={onToggleActive}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Delete Option */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="block font-extrabold text-slate-800 text-xs">{t('vendorMisc.tourDangerZone.deleteLabel')}</span>
            <span className="block text-[10px] text-slate-500 font-medium">{t('vendorMisc.tourDangerZone.deleteDescription')}</span>
          </div>
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 p-2 rounded-xl animate-fadeIn">
                <span className="text-[9px] font-black text-rose-800 tracking-wide">{t('vendorMisc.tourDangerZone.confirmQuestion')}</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await onDelete();
                    } finally {
                      setIsDeleting(false);
                      setShowDeleteConfirm(false);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] rounded-lg transition active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDeleting ? t('vendorMisc.tourDangerZone.deleting') : t('vendorMisc.tourDangerZone.confirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] rounded-lg transition active:scale-95 cursor-pointer"
                >
                  {t('vendorMisc.tourDangerZone.cancelDelete')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-bold text-[10px] cursor-pointer transition active:scale-95 flex items-center gap-1 shadow-xs"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>{t('vendorMisc.tourDangerZone.deleteButton')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
