import React, { useEffect, useState } from 'react';
import { Tour, TourCategory, TourSlot, User, GuideCalculatorConfig, OffroadVehicleType, DEFAULT_GUIDE_CALCULATOR_CONFIG } from '../../types';
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

const OFFROAD_TYPES: OffroadVehicleType[] = ['niva', 'uaz', 'gaz66'];

export function CalculatorTab({ tours, slots, currentUser, operatorToken, onUserUpdated, onShowNotification }: CalculatorTabProps) {
  const { t } = useLanguage();
  const config = currentUser.calculatorConfig || DEFAULT_GUIDE_CALCULATOR_CONFIG;

  const [tourId, setTourId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [participants, setParticipants] = useState<number | ''>('');
  const [pricePerPerson, setPricePerPerson] = useState<number | ''>('');
  const [busPrice, setBusPrice] = useState<number | ''>('');
  const [offroadType, setOffroadType] = useState<OffroadVehicleType | ''>('');
  const [offroadQty, setOffroadQty] = useState<number | ''>('');
  const [offroadUnitPrice, setOffroadUnitPrice] = useState<number | ''>('');
  const [sandwichPrice, setSandwichPrice] = useState<number | ''>('');
  const [villageLunchPrice, setVillageLunchPrice] = useState<number | ''>('');
  const [villageTeaPrice, setVillageTeaPrice] = useState<number | ''>('');
  const [additionalBonus, setAdditionalBonus] = useState<number | ''>('');
  const [netGuideTotalOverride, setNetGuideTotalOverride] = useState<number | null>(null);

  const [ratesOpen, setRatesOpen] = useState(false);
  const [rateDraft, setRateDraft] = useState<GuideCalculatorConfig>(config);
  const [savingRates, setSavingRates] = useState(false);

  const myTours = tours.filter(tr => tr.vendorId === currentUser.id);
  const selectedTour = myTours.find(tr => tr.id === tourId);
  const tourSlots = slots.filter(s => s.tourId === tourId);
  const selectedSlot = tourSlots.find(s => s.id === slotId);

  useEffect(() => {
    setSlotId('');
    setNetGuideTotalOverride(null);
    setParticipants('');
    setPricePerPerson(selectedTour?.price !== undefined ? selectedTour.price : '');
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

  useEffect(() => {
    if (!offroadType) { setOffroadUnitPrice(''); return; }
    const priceKey = offroadType === 'niva' ? 'nivaPrice' : offroadType === 'uaz' ? 'uazPrice' : 'gaz66Price';
    setOffroadUnitPrice(config[priceKey]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offroadType]);

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
  const mainGuidePayment = mainGuideRate * durationDays;
  const assistantGuidePayment = assistantGuideRate * durationDays;
  const participantsNum = participants === '' ? 0 : Number(participants);
  // Main and assistant guide are different people — each gets their own second bonus, computed
  // from their own multiplier, not a shared pool.
  const mainGuideSecondBonus = participantsNum * config.mainGuideSecondBonusMultiplier;
  const assistantGuideSecondBonus = participantsNum * config.assistantGuideSecondBonusMultiplier;
  const additionalBonusNum = additionalBonus === '' ? 0 : Number(additionalBonus);
  const mainGuideTotal = mainGuidePayment + mainGuideSecondBonus;
  const assistantGuideTotal = assistantGuidePayment + assistantGuideSecondBonus;
  const computedGuideTotal = mainGuideTotal + assistantGuideTotal + additionalBonusNum;
  const netGuideTotal = netGuideTotalOverride !== null ? netGuideTotalOverride : computedGuideTotal;

  const pricePerPersonNum = pricePerPerson === '' ? 0 : Number(pricePerPerson);
  const busPriceNum = busPrice === '' ? 0 : Number(busPrice);
  const offroadQtyNum = offroadQty === '' ? 0 : Number(offroadQty);
  const offroadUnitPriceNum = offroadUnitPrice === '' ? 0 : Number(offroadUnitPrice);
  const offroadTotal = offroadType ? offroadQtyNum * offroadUnitPriceNum : 0;
  const sandwichTotal = (sandwichPrice === '' ? 0 : Number(sandwichPrice)) * participantsNum;
  const villageLunchTotal = (villageLunchPrice === '' ? 0 : Number(villageLunchPrice)) * participantsNum;
  const villageTeaTotal = (villageTeaPrice === '' ? 0 : Number(villageTeaPrice)) * participantsNum;
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
        onChange={(e) => setRateDraft(prev => ({ ...prev, [key]: Number(e.target.value) }))}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
      />
    </div>
  );

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
        },
        body: JSON.stringify({ calculatorConfig: rateDraft }),
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
          {/* Category-derived guide rate tier */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Tags className="w-4 h-4 text-emerald-700" />
              {t('vendorCalculator.tier.label')}
            </h4>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${tierBadgeClass}`}>{tierLabel}</span>
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
                {numberInput(netGuideTotal, (v) => setNetGuideTotalOverride(v === '' ? 0 : v), { min: 0 })}
              </div>
            </div>
          </div>

          {/* Offroad */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-3">{t('vendorCalculator.offroad.title')}</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {OFFROAD_TYPES.map(vt => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => setOffroadType(offroadType === vt ? '' : vt)}
                  className={`text-xs font-bold px-3 py-2 rounded-lg border transition ${
                    offroadType === vt
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t(`vendorCalculator.offroad.${vt}`)}
                </button>
              ))}
            </div>
            {offroadType && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.offroad.quantityLabel')}</label>
                  {numberInput(offroadQty, setOffroadQty, { min: 0 })}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.offroad.unitPriceLabel')}</label>
                  {numberInput(offroadUnitPrice, setOffroadUnitPrice, { min: 0 })}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">{t('vendorCalculator.offroad.totalLabel')}</label>
                  <div className="w-full bg-slate-100 text-slate-700 p-2.5 text-xs rounded-xl font-bold">{offroadTotal.toFixed(2)} AZN</div>
                </div>
              </div>
            )}
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
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-700">
                    <span className="font-bold">{t('vendorCalculator.results.assistantGuidePaymentLabel')}</span>
                    <span className="font-black">{assistantGuideTotal.toFixed(2)} AZN</span>
                  </div>
                </div>
              </div>
              {additionalBonusNum > 0 && resultRow(t('vendorCalculator.inputs.additionalBonusLabel'), additionalBonusNum)}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-300">{t('vendorCalculator.results.guideTotalLabel')}</span>
                <span className="text-sm font-black">{netGuideTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <h4 className="text-xs font-bold tracking-widest text-slate-300 mb-2">{t('vendorCalculator.results.otherCostsTitle')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {resultRow(t('vendorCalculator.results.busCostLabel'), busPriceNum)}
                {offroadType && resultRow(t('vendorCalculator.results.offroadCostLabel'), offroadTotal)}
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
