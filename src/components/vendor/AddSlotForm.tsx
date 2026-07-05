import { useState, FormEvent, ChangeEvent } from 'react';
import { Tour, TourSlot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface AddSlotFormProps {
  myTours: Tour[];
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onSuccess: () => void;
}

export function AddSlotForm({ myTours, onAddSlot, onShowNotification, onSuccess }: AddSlotFormProps) {
  const { t } = useLanguage();
  const [slotTourId, setSlotTourId] = useState<string>('');
  const [slotStartDate, setSlotStartDate] = useState<string>('');
  const [slotEndDate, setSlotEndDate] = useState<string>('');
  const [slotPrice, setSlotPrice] = useState<number | ''>(35);
  const [slotCapacity, setSlotCapacity] = useState<number | ''>(20);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  // See TourForm.tsx for the same fix and rationale: keeps the field fully clearable
  // instead of forcing a "0" back in when the user deletes all digits.
  const handleNumberInput = (setter: (v: number | '') => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setter(raw === '' ? '' : Number(raw));
  };

  const handleSlotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slotTourId || !slotStartDate || !slotEndDate) {
      if (onShowNotification) {
        onShowNotification(t('vendorMisc.addSlotForm.fillAllFields'), 'error');
      } else {
        alert(t('vendorMisc.addSlotForm.fillAllFields'));
      }
      return;
    }

    const newSlot: TourSlot = {
      id: 'slot-' + Math.floor(Math.random() * 90000 + 10000),
      tourId: slotTourId,
      startDate: slotStartDate,
      endDate: slotEndDate,
      price: Number(slotPrice),
      capacity: Number(slotCapacity),
      bookedCount: 0
    };

    setIsSavingForm(true);
    setFormSubmitError(null);
    try {
      await onAddSlot(newSlot);
      onSuccess();
      // Clear form
      setSlotTourId('');
      setSlotStartDate('');
      setSlotEndDate('');
    } catch (err: any) {
      setFormSubmitError(err?.message || t('vendorMisc.addSlotForm.addDateError'));
    } finally {
      setIsSavingForm(false);
    }
  };

  return (
    <form onSubmit={handleSlotSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div>
        <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">{t('vendorMisc.addSlotForm.activeSalesLabel')}</span>
        <h3 className="font-bold text-slate-900 text-sm">{t('vendorMisc.addSlotForm.formTitle')}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          {t('vendorMisc.addSlotForm.formSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorMisc.addSlotForm.tourSelectLabel')}</label>
          <select
            required
            value={slotTourId}
            onChange={(e) => setSlotTourId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="">{t('vendorMisc.addSlotForm.tourSelectPlaceholder')}</option>
            {myTours.map(tour => (
              <option key={tour.id} value={tour.id}>{tour.name} ({tour.region})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorMisc.addSlotForm.priceLabel')}</label>
          <input
            type="number"
            min="5"
            max="1000"
            required
            value={slotPrice}
            onChange={handleNumberInput(setSlotPrice)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorMisc.addSlotForm.startDateLabel')}</label>
          <input
            type="date"
            required
            value={slotStartDate}
            onChange={(e) => setSlotStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorMisc.addSlotForm.endDateLabel')}</label>
          <input
            type="date"
            required
            value={slotEndDate}
            onChange={(e) => setSlotEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{t('vendorMisc.addSlotForm.capacityLabel')}</label>
          <input
            type="number"
            min="2"
            max="50"
            required
            value={slotCapacity}
            onChange={handleNumberInput(setSlotCapacity)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>
      </div>

      {formSubmitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
          ⚠️ {formSubmitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSavingForm}
        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
      >
        {isSavingForm ? t('vendorMisc.addSlotForm.saving') : t('vendorMisc.addSlotForm.activateButton')}
      </button>
    </form>
  );
}
