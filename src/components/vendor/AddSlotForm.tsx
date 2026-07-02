import { useState, FormEvent } from 'react';
import { Tour, TourSlot } from '../../types';

interface AddSlotFormProps {
  myTours: Tour[];
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onSuccess: () => void;
}

export function AddSlotForm({ myTours, onAddSlot, onShowNotification, onSuccess }: AddSlotFormProps) {
  const [slotTourId, setSlotTourId] = useState<string>('');
  const [slotStartDate, setSlotStartDate] = useState<string>('');
  const [slotEndDate, setSlotEndDate] = useState<string>('');
  const [slotPrice, setSlotPrice] = useState<number>(35);
  const [slotCapacity, setSlotCapacity] = useState<number>(20);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  const handleSlotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slotTourId || !slotStartDate || !slotEndDate) {
      if (onShowNotification) {
        onShowNotification('Zəhmət olmasa bütün xanaları doldurun.', 'error');
      } else {
        alert('Zəhmət olmasa bütün xanaları doldurun.');
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
      setFormSubmitError(err?.message || 'Tarix əlavə edilərkən xəta baş verdi.');
    } finally {
      setIsSavingForm(false);
    }
  };

  return (
    <form onSubmit={handleSlotSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div>
        <span className="text-[10px] tracking-widest text-slate-400 font-bold block mb-1">Aktiv Satış</span>
        <h3 className="font-bold text-slate-900 text-sm">Tur üçün xüsusi çıxış tarixi təyin edin</h3>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          Müştərilərin bilet alması üçün bilet qiyməti və çıxış-dönüş təqvim slotunu seçin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Tur marşrutunu seçin:</label>
          <select
            required
            value={slotTourId}
            onChange={(e) => setSlotTourId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="">İstədiyiniz marşrutu seçin</option>
            {myTours.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bilet Qiyməti (AZN):</label>
          <input
            type="number"
            min="5"
            max="1000"
            required
            value={slotPrice}
            onChange={(e) => setSlotPrice(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Başlama Tarixi:</label>
          <input
            type="date"
            required
            value={slotStartDate}
            onChange={(e) => setSlotStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Bitmə Tarixi:</label>
          <input
            type="date"
            required
            value={slotEndDate}
            onChange={(e) => setSlotEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">Maksimum Avtobus / Bələdçi Limiti (Nəfər):</label>
          <input
            type="number"
            min="2"
            max="50"
            required
            value={slotCapacity}
            onChange={(e) => setSlotCapacity(Number(e.target.value))}
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
        {isSavingForm ? 'Yadda saxlanılır...' : 'Təqvim slotunu aktivləşdir (Satışa aç)'}
      </button>
    </form>
  );
}
