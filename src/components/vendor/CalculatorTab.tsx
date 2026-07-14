import React, { useEffect, useState } from 'react';
import { Tour, TourSlot, User, DEFAULT_GUIDE_CALCULATOR_CONFIG } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Calculator, Mountain, Save } from 'lucide-react';

interface CalculatorTabProps {
  tours: Tour[];
  slots: TourSlot[];
  currentUser: User;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export function CalculatorTab({ tours, slots, currentUser, onEditTour, onShowNotification }: CalculatorTabProps) {
  const { t } = useLanguage();
  const config = currentUser.calculatorConfig || DEFAULT_GUIDE_CALCULATOR_CONFIG;

  const [tourId, setTourId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [participants, setParticipants] = useState<number | ''>('');
  const [pricePerPerson, setPricePerPerson] = useState<number | ''>('');
  const [busPrice, setBusPrice] = useState<number | ''>('');
  const [additionalBonus, setAdditionalBonus] = useState<number | ''>('');
  const [altitudeInput, setAltitudeInput] = useState<number | ''>('');
  const [saveAltitude, setSaveAltitude] = useState(false);
  const [netGuideTotalOverride, setNetGuideTotalOverride] = useState<number | null>(null);
  const [savingAltitude, setSavingAltitude] = useState(false);

  const myTours = tours.filter(tr => tr.vendorId === currentUser.id);
  const selectedTour = myTours.find(tr => tr.id === tourId);
  const tourSlots = slots.filter(s => s.tourId === tourId);
  const selectedSlot = tourSlots.find(s => s.id === slotId);

  useEffect(() => {
    setSlotId('');
    setNetGuideTotalOverride(null);
    setSaveAltitude(false);
    if (selectedTour) {
      setParticipants('');
      setPricePerPerson(selectedTour.price !== undefined ? selectedTour.price : '');
      setAltitudeInput(selectedTour.maxAltitude !== undefined ? selectedTour.maxAltitude : '');
    } else {
      setParticipants('');
      setPricePerPerson('');
      setAltitudeInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(() => {
    if (selectedSlot) {
      setParticipants(selectedSlot.bookedCount);
      setPricePerPerson(selectedSlot.price);
    }
    setNetGuideTotalOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (!currentUser.calculatorEnabled) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
        <h3 className="text-base font-bold text-slate-800">{t('vendorCalculator.disabled.title')}</h3>
        <p className="text-sm text-slate-500">{t('vendorCalculator.disabled.description')}</p>
      </div>
    );
  }

  const durationDays = selectedTour?.durationDays || 1;
  const altitudeKnown = selectedTour?.maxAltitude !== undefined;
  const effectiveAltitude = altitudeKnown ? selectedTour!.maxAltitude! : (altitudeInput === '' ? undefined : Number(altitudeInput));
  const isHighAltitude = effectiveAltitude !== undefined && effectiveAltitude > config.altitudeThreshold;

  const mainGuideRate = isHighAltitude ? config.highAltitudeBaseGuideDailyRate : config.baseGuideDailyRate;
  const assistantGuideRate = isHighAltitude ? config.highAltitudeAssistantGuideDailyRate : config.assistantGuideDailyRate;
  const mainGuidePayment = mainGuideRate * durationDays;
  const assistantGuidePayment = assistantGuideRate * durationDays;
  const participantsNum = participants === '' ? 0 : Number(participants);
  const secondBonus = participantsNum * config.secondBonusMultiplier;
  const additionalBonusNum = additionalBonus === '' ? 0 : Number(additionalBonus);
  const computedGuideTotal = mainGuidePayment + assistantGuidePayment + secondBonus + additionalBonusNum;
  const netGuideTotal = netGuideTotalOverride !== null ? netGuideTotalOverride : computedGuideTotal;
  const pricePerPersonNum = pricePerPerson === '' ? 0 : Number(pricePerPerson);
  const busPriceNum = busPrice === '' ? 0 : Number(busPrice);
  const collected = participantsNum * pricePerPersonNum;
  const netIncome = collected - busPriceNum - netGuideTotal;

  const handleSaveAltitude = async () => {
    if (!selectedTour || !onEditTour || altitudeInput === '') return;
    setSavingAltitude(true);
    try {
      await onEditTour({ ...selectedTour, maxAltitude: Number(altitudeInput) });
      if (onShowNotification) onShowNotification(t('vendorCalculator.altitude.saveSuccess'), 'success');
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.altitude.saveError'), 'error');
    } finally {
      setSavingAltitude(false);
    }
  };

  const numberInput = (value: number | '', onChange: (v: number | '') => void, extraProps: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
      {...extraProps}
    />
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-700" />
          {t('vendorCalculator.header.title')}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{t('vendorCalculator.header.subtitle')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.tourPicker.tourLabel')}</label>
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
            >
              <option value="">{t('vendorCalculator.tourPicker.tourPlaceholder')}</option>
              {myTours.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.name} ({tr.region})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.tourPicker.slotLabel')}</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              disabled={!tourId}
              className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs disabled:bg-slate-100 disabled:text-slate-400 font-bold"
            >
              <option value="">{t('vendorCalculator.tourPicker.slotPlaceholder')}</option>
              {tourSlots.map(s => (
                <option key={s.id} value={s.id}>{s.startDate} ({s.price} AZN)</option>
              ))}
            </select>
          </div>
        </div>

        {!tourId && (
          <p className="text-xs text-slate-400 mt-4">{t('vendorCalculator.tourPicker.noTourSelected')}</p>
        )}
      </div>

      {tourId && (
        <>
          {/* Altitude */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Mountain className="w-4 h-4 text-emerald-700" />
              {t('vendorCalculator.altitude.label')}
            </h4>
            {altitudeKnown ? (
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-800">{selectedTour!.maxAltitude} {t('vendorCalculator.altitude.unit')}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${isHighAltitude ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {isHighAltitude ? t('vendorCalculator.altitude.peakTier', { threshold: config.altitudeThreshold }) : t('vendorCalculator.altitude.hikingTier', { threshold: config.altitudeThreshold })}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{t('vendorCalculator.altitude.missingNotice')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-32">{numberInput(altitudeInput, setAltitudeInput, { min: 0 })}</div>
                  <span className="text-xs text-slate-500">{t('vendorCalculator.altitude.unit')}</span>
                  {altitudeInput !== '' && (
                    isHighAltitude
                      ? <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-800">{t('vendorCalculator.altitude.peakTier', { threshold: config.altitudeThreshold })}</span>
                      : <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">{t('vendorCalculator.altitude.hikingTier', { threshold: config.altitudeThreshold })}</span>
                  )}
                  {onEditTour && (
                    <button
                      type="button"
                      disabled={altitudeInput === '' || savingAltitude}
                      onClick={handleSaveAltitude}
                      className="text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {t('vendorCalculator.altitude.saveToTour')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inputs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.inputs.participantsLabel')}</label>
                {numberInput(participants, setParticipants, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.inputs.pricePerPersonLabel')}</label>
                {numberInput(pricePerPerson, setPricePerPerson, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.inputs.durationDaysLabel')}</label>
                <div className="w-full bg-slate-100 text-slate-500 p-2.5 text-xs rounded-xl font-bold">{durationDays}</div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.inputs.busPriceLabel')}</label>
                {numberInput(busPrice, setBusPrice, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.inputs.additionalBonusLabel')}</label>
                {numberInput(additionalBonus, setAdditionalBonus, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('vendorCalculator.inputs.netGuideTotalLabel')}
                  <span className="block text-[10px] font-normal text-slate-400">{t('vendorCalculator.inputs.netGuideTotalHint')}</span>
                </label>
                {numberInput(netGuideTotal, (v) => setNetGuideTotalOverride(v === '' ? 0 : v), { min: 0 })}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs space-y-3">
            <h4 className="text-xs font-bold tracking-widest text-slate-300">{t('vendorCalculator.results.title')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between border-b border-slate-700 pb-1.5">
                <span className="text-slate-400">{t('vendorCalculator.results.collectedLabel')}</span>
                <span className="font-bold">{collected.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-1.5">
                <span className="text-slate-400">{t('vendorCalculator.results.mainGuidePaymentLabel')}</span>
                <span className="font-bold">{mainGuidePayment.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-1.5">
                <span className="text-slate-400">{t('vendorCalculator.results.assistantGuidePaymentLabel')}</span>
                <span className="font-bold">{assistantGuidePayment.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-1.5">
                <span className="text-slate-400">{t('vendorCalculator.results.secondBonusLabel', { multiplier: config.secondBonusMultiplier })}</span>
                <span className="font-bold">{secondBonus.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-1.5">
                <span className="text-slate-400">{t('vendorCalculator.results.guideTotalLabel')}</span>
                <span className="font-bold">{netGuideTotal.toFixed(2)} AZN</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-emerald-300">{t('vendorCalculator.results.netIncomeLabel')}</span>
              <span className="text-xl font-black text-emerald-300">{netIncome.toFixed(2)} AZN</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
