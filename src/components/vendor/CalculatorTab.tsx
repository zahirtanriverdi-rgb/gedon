import React, { useState } from 'react';
import { Tour, TourCategory, TourSlot, User, GuideCalculatorConfig, DEFAULT_GUIDE_CALCULATOR_CONFIG } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Calculator, Tags, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface CalculatorTabProps {
  tours: Tour[];
  slots: TourSlot[];
  currentUser: User;
  operatorToken?: string | null;
  onUserUpdated?: (updatedUser: User) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Guide rate tier is derived from the tour's own category — always set, unlike the old
// altitude-based approach which needed a manual field vendors often left empty. 'active' and
// 'international' tours fall back to the hiking tier.
type GuideTier = 'hiking' | 'camp' | 'peak';
function tierForCategory(category: TourCategory): GuideTier {
  if (category === 'peak') return 'peak';
  if (category === 'camp') return 'camp';
  return 'hiking';
}

// Editable draft mirrors GuideCalculatorConfig but allows '' mid-edit so a field can be fully
// cleared before typing a new value — using `number` directly forces every clear to collapse to
// 0, which then makes the next keystroke append after that 0 (e.g. typing "50" becomes "050").
type RateDraft = { [K in keyof GuideCalculatorConfig]: number | '' };
const resolveNum = (v: number | '') => (v === '' ? 0 : v);

export function CalculatorTab({ tours, slots, currentUser, operatorToken, onUserUpdated, onShowNotification }: CalculatorTabProps) {
  const { t } = useLanguage();
  // Merge (not replace) over the defaults — a config saved before a new rate field existed
  // would otherwise leave that field `undefined` and turn every total into NaN.
  const config = { ...DEFAULT_GUIDE_CALCULATOR_CONFIG, ...(currentUser.calculatorConfig || {}) };

  const [tourId, setTourId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [participants, setParticipants] = useState<number | ''>('');
  const [pricePerPerson, setPricePerPerson] = useState<number | ''>('');
  const [busPrice, setBusPrice] = useState<number | ''>('');
  // Vendors can mix vehicle types on one tour (e.g. 1 UAZ + 2 Niva) — each type gets its own
  // quantity + unit price rather than a single exclusive selection.
  const [nivaQty, setNivaQty] = useState<number | ''>('');
  const [nivaUnitPrice, setNivaUnitPrice] = useState<number | ''>(config.nivaPrice);
  const [uazQty, setUazQty] = useState<number | ''>('');
  const [uazUnitPrice, setUazUnitPrice] = useState<number | ''>(config.uazPrice);
  const [gaz66Qty, setGaz66Qty] = useState<number | ''>('');
  const [gaz66UnitPrice, setGaz66UnitPrice] = useState<number | ''>(config.gaz66Price);
  const [sandwichPrice, setSandwichPrice] = useState<number | ''>('');
  const [villageLunchPrice, setVillageLunchPrice] = useState<number | ''>('');
  const [villageTeaPrice, setVillageTeaPrice] = useState<number | ''>('');
  const [additionalBonus, setAdditionalBonus] = useState<number | ''>('');
  // A 3rd guide on the tour is automatically treated as a second assistant guide — same rate,
  // same role — so assistant-side pay scales by count rather than needing a separate rate tier.
  const [hasThirdGuide, setHasThirdGuide] = useState(false);
  const [netGuideTotalOverride, setNetGuideTotalOverride] = useState<number | '' | null>(null);

  const [ratesOpen, setRatesOpen] = useState(false);
  const [rateDraft, setRateDraft] = useState<RateDraft>(config);
  const [savingRates, setSavingRates] = useState(false);

  const myTours = tours.filter(tr => tr.vendorId === currentUser.id);
  const selectedTour = myTours.find(tr => tr.id === tourId);
  const tourSlots = slots.filter(s => s.tourId === tourId);
  const selectedSlot = tourSlots.find(s => s.id === slotId);

  const handleTourChange = (id: string) => {
    setTourId(id);
    setSlotId('');
    setNetGuideTotalOverride(null);
    const tour = myTours.find(tr => tr.id === id);
    setParticipants('');
    setPricePerPerson(tour?.price !== undefined ? tour.price : '');
  };

  const handleSlotChange = (id: string) => {
    setSlotId(id);
    const slot = tourSlots.find(s => s.id === id);
    if (slot) {
      setParticipants(slot.bookedCount);
      setPricePerPerson(slot.price);
    }
    setNetGuideTotalOverride(null);
  };

  if (!currentUser.calculatorEnabled) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
        <h3 className="text-base font-bold text-slate-800">{t('vendorCalculator.disabled.title')}</h3>
        <p className="text-sm text-slate-500">{t('vendorCalculator.disabled.description')}</p>
      </div>
    );
  }

  const durationDays = selectedTour?.durationDays || 1;
  const tier: GuideTier = selectedTour ? tierForCategory(selectedTour.category) : 'hiking';
  const mainGuideRate = tier === 'peak' ? config.peakBaseGuideDailyRate : tier === 'camp' ? config.campBaseGuideDailyRate : config.hikingBaseGuideDailyRate;
  const assistantGuideRate = tier === 'peak' ? config.peakAssistantGuideDailyRate : tier === 'camp' ? config.campAssistantGuideDailyRate : config.hikingAssistantGuideDailyRate;
  // A 3rd guide is a second assistant guide — assistant-side base pay and second bonus scale by
  // how many assistants there are (1 normally, 2 when hasThirdGuide is checked).
  const numAssistants = hasThirdGuide ? 2 : 1;
  const mainGuidePayment = mainGuideRate * durationDays;
  const assistantGuidePaymentPerGuide = assistantGuideRate * durationDays;
  const assistantGuidePayment = assistantGuidePaymentPerGuide * numAssistants;
  const participantsNum = resolveNum(participants);
  // Main and assistant guide are different people — each gets their own second bonus, computed
  // from their own multiplier, not a shared pool.
  const mainGuideSecondBonus = participantsNum * config.mainGuideSecondBonusMultiplier;
  const assistantGuideSecondBonusPerGuide = participantsNum * config.assistantGuideSecondBonusMultiplier;
  const assistantGuideSecondBonus = assistantGuideSecondBonusPerGuide * numAssistants;
  const additionalBonusNum = resolveNum(additionalBonus);
  // Manual/discretionary bonus splits automatically: 60% to the main guide, 40% shared across
  // the assistant guide(s).
  const mainBonusShare = additionalBonusNum * 0.6;
  const assistantBonusShare = additionalBonusNum * 0.4;
  const mainGuideTotal = mainGuidePayment + mainGuideSecondBonus + mainBonusShare;
  const assistantGuideTotal = assistantGuidePayment + assistantGuideSecondBonus + assistantBonusShare;
  const computedGuideTotal = mainGuideTotal + assistantGuideTotal;
  // The override field shows the live computed total until the vendor types their own number;
  // resolving '' to 0 only happens for the math below, not for what's displayed while editing.
  const netGuideTotalDisplay = netGuideTotalOverride !== null ? netGuideTotalOverride : computedGuideTotal;
  const netGuideTotal = resolveNum(netGuideTotalDisplay);

  const pricePerPersonNum = resolveNum(pricePerPerson);
  const busPriceNum = resolveNum(busPrice);
  const nivaTotal = resolveNum(nivaQty) * resolveNum(nivaUnitPrice);
  const uazTotal = resolveNum(uazQty) * resolveNum(uazUnitPrice);
  const gaz66Total = resolveNum(gaz66Qty) * resolveNum(gaz66UnitPrice);
  const offroadTotal = nivaTotal + uazTotal + gaz66Total;
  const sandwichTotal = resolveNum(sandwichPrice) * participantsNum;
  const villageLunchTotal = resolveNum(villageLunchPrice) * participantsNum;
  const villageTeaTotal = resolveNum(villageTeaPrice) * participantsNum;
  const foodTotal = sandwichTotal + villageLunchTotal + villageTeaTotal;
  const otherCostsTotal = busPriceNum + offroadTotal + foodTotal;

  const collected = participantsNum * pricePerPersonNum;
  const netIncome = collected - otherCostsTotal - netGuideTotal;

  const numberInput = (value: number | '', onChange: (v: number | '') => void, extraProps: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
      {...extraProps}
    />
  );

  const tierBadgeClass = tier === 'peak' ? 'bg-red-100 text-red-800' : tier === 'camp' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  const tierLabel = tier === 'peak' ? t('vendorCalculator.tier.peak') : tier === 'camp' ? t('vendorCalculator.tier.camp') : t('vendorCalculator.tier.hiking');

  const openRates = () => {
    if (ratesOpen) { setRatesOpen(false); return; }
    setRateDraft(config);
    setRatesOpen(true);
  };

  const rateNumberField = (label: string, key: keyof GuideCalculatorConfig) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        step="0.1"
        value={rateDraft[key]}
        onChange={(e) => setRateDraft(prev => ({ ...prev, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
      />
    </div>
  );

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const payload: GuideCalculatorConfig = Object.fromEntries(
        Object.entries(rateDraft).map(([k, v]) => [k, resolveNum(v as number | '')])
      ) as unknown as GuideCalculatorConfig;
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
        },
        body: JSON.stringify({ calculatorConfig: payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      if (onUserUpdated && data.user) onUserUpdated(data.user);
      if (onShowNotification) onShowNotification(t('vendorCalculator.rates.saveSuccess'), 'success');
      setRatesOpen(false);
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.rates.saveError'), 'error');
    } finally {
      setSavingRates(false);
    }
  };

  const resultRow = (label: string, value: number, bold = false) => (
    <div className="flex justify-between border-b border-slate-700 pb-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={bold ? 'font-black' : 'font-bold'}>{value.toFixed(2)} AZN</span>
    </div>
  );

  const offroadRow = (
    label: string,
    qty: number | '',
    setQty: (v: number | '') => void,
    unitPrice: number | '',
    setUnitPrice: (v: number | '') => void,
    total: number
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div className="text-xs font-bold text-slate-700">{label}</div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold text-slate-500">{t('vendorCalculator.offroad.quantityLabel')}</label>
        {numberInput(qty, setQty, { min: 0 })}
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold text-slate-500">{t('vendorCalculator.offroad.unitPriceLabel')}</label>
        {numberInput(unitPrice, setUnitPrice, { min: 0 })}
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold text-slate-500">{t('vendorCalculator.offroad.totalLabel')}</label>
        <div className="w-full bg-slate-100 text-slate-700 p-2.5 text-xs rounded-xl font-bold">{total.toFixed(2)} AZN</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-700" />
              {t('vendorCalculator.header.title')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('vendorCalculator.header.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={openRates}
            className="font-bold min-h-[36px] px-3 flex items-center gap-1.5 justify-center rounded-lg text-xs transition border bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
          >
            <Settings className="w-3.5 h-3.5" />
            {t('vendorCalculator.rates.editButton')}
            {ratesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {ratesOpen && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('vendorCalculator.rates.guideRatesTitle')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rateNumberField(t('vendorCalculator.rates.hikingBase'), 'hikingBaseGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.hikingAssistant'), 'hikingAssistantGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.campBase'), 'campBaseGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.campAssistant'), 'campAssistantGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.peakBase'), 'peakBaseGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.peakAssistant'), 'peakAssistantGuideDailyRate')}
                {rateNumberField(t('vendorCalculator.rates.mainGuideBonusMultiplier'), 'mainGuideSecondBonusMultiplier')}
                {rateNumberField(t('vendorCalculator.rates.assistantGuideBonusMultiplier'), 'assistantGuideSecondBonusMultiplier')}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('vendorCalculator.rates.offroadRatesTitle')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rateNumberField(t('vendorCalculator.rates.nivaPrice'), 'nivaPrice')}
                {rateNumberField(t('vendorCalculator.rates.uazPrice'), 'uazPrice')}
                {rateNumberField(t('vendorCalculator.rates.gaz66Price'), 'gaz66Price')}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('vendorCalculator.rates.foodRatesTitle')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rateNumberField(t('vendorCalculator.rates.sandwichPrice'), 'sandwichLunchPrice')}
                {rateNumberField(t('vendorCalculator.rates.villageLunchPrice'), 'villageHouseLunchPrice')}
                {rateNumberField(t('vendorCalculator.rates.villageTeaPrice'), 'villageHouseTeaPrice')}
              </div>
            </div>
            <button
              type="button"
              disabled={savingRates}
              onClick={handleSaveRates}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[36px] px-4 flex items-center justify-center rounded-lg text-xs transition disabled:opacity-50"
            >
              {t('vendorCalculator.rates.saveButton')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.tourPicker.tourLabel')}</label>
            <select
              value={tourId}
              onChange={(e) => handleTourChange(e.target.value)}
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
              onChange={(e) => handleSlotChange(e.target.value)}
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
          {/* Category-derived guide rate tier */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Tags className="w-4 h-4 text-emerald-700" />
                {t('vendorCalculator.tier.label')}
              </h4>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${tierBadgeClass}`}>{tierLabel}</span>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasThirdGuide}
                onChange={(e) => setHasThirdGuide(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              {t('vendorCalculator.thirdGuide.checkboxLabel')}
            </label>
          </div>

          {/* Core inputs */}
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
                <label className="block text-xs font-semibold text-slate-700">
                  {t('vendorCalculator.inputs.additionalBonusLabel')}
                  <span className="block text-[10px] font-normal text-slate-400">{t('vendorCalculator.inputs.additionalBonusHint')}</span>
                </label>
                {numberInput(additionalBonus, setAdditionalBonus, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('vendorCalculator.inputs.netGuideTotalLabel')}
                  <span className="block text-[10px] font-normal text-slate-400">{t('vendorCalculator.inputs.netGuideTotalHint')}</span>
                </label>
                {numberInput(netGuideTotalDisplay, setNetGuideTotalOverride, { min: 0 })}
              </div>
            </div>
          </div>

          {/* Offroad — vendor can mix vehicle types (e.g. 1 UAZ + 2 Niva) in one calculation */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700">{t('vendorCalculator.offroad.title')}</h4>
            {offroadRow(t('vendorCalculator.offroad.niva'), nivaQty, setNivaQty, nivaUnitPrice, setNivaUnitPrice, nivaTotal)}
            {offroadRow(t('vendorCalculator.offroad.uaz'), uazQty, setUazQty, uazUnitPrice, setUazUnitPrice, uazTotal)}
            {offroadRow(t('vendorCalculator.offroad.gaz66'), gaz66Qty, setGaz66Qty, gaz66UnitPrice, setGaz66UnitPrice, gaz66Total)}
          </div>

          {/* Food */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-3">{t('vendorCalculator.food.title')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.food.sandwichLabel')}</label>
                {numberInput(sandwichPrice, setSandwichPrice, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.food.villageLunchLabel')}</label>
                {numberInput(villageLunchPrice, setVillageLunchPrice, { min: 0 })}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.food.villageTeaLabel')}</label>
                {numberInput(villageTeaPrice, setVillageTeaPrice, { min: 0 })}
              </div>
            </div>
          </div>

          {/* Results — clear "who gets how much" breakdown */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs space-y-5">
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-300 mb-2">{t('vendorCalculator.results.guidesTitle')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('vendorCalculator.results.mainGuideBaseLabel')}</span>
                    <span>{mainGuidePayment.toFixed(2)} AZN</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('vendorCalculator.results.mainGuideBonusLabel')}</span>
                    <span>{mainGuideSecondBonus.toFixed(2)} AZN</span>
                  </div>
                  {mainBonusShare > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>{t('vendorCalculator.results.mainBonusShareLabel')}</span>
                      <span>{mainBonusShare.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-700">
                    <span className="font-bold">{t('vendorCalculator.results.mainGuidePaymentLabel')}</span>
                    <span className="font-black">{mainGuideTotal.toFixed(2)} AZN</span>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('vendorCalculator.results.assistantGuideBaseLabel')}</span>
                    <span>{assistantGuidePayment.toFixed(2)} AZN</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('vendorCalculator.results.assistantGuideBonusLabel')}</span>
                    <span>{assistantGuideSecondBonus.toFixed(2)} AZN</span>
                  </div>
                  {assistantBonusShare > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>{t('vendorCalculator.results.assistantBonusShareLabel')}</span>
                      <span>{assistantBonusShare.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-700">
                    <span className="font-bold">
                      {hasThirdGuide ? t('vendorCalculator.results.assistantGuidePaymentLabelPlural') : t('vendorCalculator.results.assistantGuidePaymentLabel')}
                    </span>
                    <span className="font-black">{assistantGuideTotal.toFixed(2)} AZN</span>
                  </div>
                  {hasThirdGuide && (
                    <div className="text-[10px] text-slate-500 text-right">
                      {t('vendorCalculator.results.perGuideNote', { amount: (assistantGuideTotal / 2).toFixed(2) })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-300">{t('vendorCalculator.results.guideTotalLabel')}</span>
                <span className="text-sm font-black">{netGuideTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <h4 className="text-xs font-bold tracking-widest text-slate-300 mb-2">{t('vendorCalculator.results.otherCostsTitle')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {resultRow(t('vendorCalculator.results.busCostLabel'), busPriceNum)}
                {nivaTotal > 0 && resultRow(t('vendorCalculator.offroad.niva'), nivaTotal)}
                {uazTotal > 0 && resultRow(t('vendorCalculator.offroad.uaz'), uazTotal)}
                {gaz66Total > 0 && resultRow(t('vendorCalculator.offroad.gaz66'), gaz66Total)}
                {sandwichTotal > 0 && resultRow(t('vendorCalculator.food.sandwichLabel'), sandwichTotal)}
                {villageLunchTotal > 0 && resultRow(t('vendorCalculator.food.villageLunchLabel'), villageLunchTotal)}
                {villageTeaTotal > 0 && resultRow(t('vendorCalculator.food.villageTeaLabel'), villageTeaTotal)}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-300">{t('vendorCalculator.results.otherCostsTotalLabel')}</span>
                <span className="text-sm font-black">{otherCostsTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t('vendorCalculator.results.collectedLabel')}</span>
                <span className="font-bold">{collected.toFixed(2)} AZN</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold text-emerald-300">{t('vendorCalculator.results.netIncomeLabel')}</span>
                <span className="text-xl font-black text-emerald-300">{netIncome.toFixed(2)} AZN</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
