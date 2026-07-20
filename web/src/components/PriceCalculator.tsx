'use client';
import React, { useState } from 'react';
import { Calculator, Users, Map, Tent, Sun, Info } from 'lucide-react';
import { PriceCalculatorConfig } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

// Fallback used only if no config prop is passed in at all (defensive default, shouldn't
// normally happen since App.tsx always provides platformConfig.priceCalculatorConfig).
const FALLBACK_CONFIG: PriceCalculatorConfig = {
  destinations: { "İsmayıllı": 175, "Nabran": 220, "Şəki": 350, "Qəbələ": 225, "Şamaxı": 122, "Quba": 168, "Qusar": 185 },
  busRatePerKm: 2.5,
  busCampSurcharge: 100,
  guideDailyBase: 50,
  guideCampBase: 70,
  guidePerParticipant: 1.5,
  foodDailyKendPrice: 15,
  foodDailySendvicPrice: 4,
  campBreakfastPrice: 2,
  campLunchPrice: 10,
  tentRentalPrice: 9,
  sleepingBagRentalPrice: 6,
  matRentalPrice: 2,
};

export interface PriceCalculatorProps {
  onBack?: () => void;
  config?: PriceCalculatorConfig;
  // All cfg rates are authored in AZN; these let the result cards follow the header's
  // currency selection (EN visitors browse in USD/EUR) instead of always showing AZN.
  displayCurrency?: 'AZN' | 'USD' | 'EUR';
  exchangeRates?: { USD: number; EUR: number };
}

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({ onBack, config, displayCurrency = 'AZN', exchangeRates }) => {
  const { t } = useLanguage();
  const cfg = config || FALLBACK_CONFIG;
  const distances = cfg.destinations;

  const [destination, setDestination] = useState<string>('');
  const [tourType, setTourType] = useState<'daily' | 'camp'>('daily');
  const [participants, setParticipants] = useState<number>(1);

  // Daily food
  const [dailyFood, setDailyFood] = useState<'kend' | 'sendvic' | 'yox'>('yox');
  
  // Camp food
  const [campBreakfast, setCampBreakfast] = useState<boolean>(false);
  const [campLunch, setCampLunch] = useState<boolean>(false);

  // Camp equipment
  const [needTent, setNeedTent] = useState<boolean>(false);
  const [hasOwnTent, setHasOwnTent] = useState<boolean>(false);
  const [needSleepingBag, setNeedSleepingBag] = useState<boolean>(false);
  const [needMat, setNeedMat] = useState<boolean>(false);

  // Calculations — every rate/fee here comes from `cfg` (admin-managed), not a hardcoded
  // constant, so changes in AdminPortal take effect the next time this recalculates.
  const calculateCosts = () => {
    if (!destination || participants < 1) return null;

    const distance = distances[destination];
    
    // Bus
    let totalBus = distance * cfg.busRatePerKm;
    if (tourType === 'camp') {
      totalBus += cfg.busCampSurcharge;
    }
    const ppBus = totalBus / participants;

    // Guide
    let totalGuide = 0;
    if (tourType === 'daily') {
      totalGuide = cfg.guideDailyBase + (participants * cfg.guidePerParticipant);
    } else {
      totalGuide = cfg.guideCampBase + (participants * cfg.guidePerParticipant);
    }
    const ppGuide = totalGuide / participants;

    // Food
    let ppFood = 0;
    if (tourType === 'daily') {
      if (dailyFood === 'kend') ppFood = cfg.foodDailyKendPrice;
      else if (dailyFood === 'sendvic') ppFood = cfg.foodDailySendvicPrice;
    } else {
      if (campBreakfast) ppFood += cfg.campBreakfastPrice;
      if (campLunch) ppFood += cfg.campLunchPrice;
    }

    // Equipment
    let ppEq = 0;
    if (tourType === 'camp') {
      if (needTent && !hasOwnTent) ppEq += cfg.tentRentalPrice;
      if (needSleepingBag) ppEq += cfg.sleepingBagRentalPrice;
      if (needMat) ppEq += cfg.matRentalPrice;
    }

    const ppTotal = ppBus + ppGuide + ppFood + ppEq;
    const groupTotal = ppTotal * participants;

    return {
      ppBus,
      ppGuide,
      ppFood,
      ppEq,
      ppTotal,
      groupTotal
    };
  };

  const costs = calculateCosts();

  const formatMoney = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '—';
    if (displayCurrency === 'USD' && exchangeRates?.USD) return (val / exchangeRates.USD).toFixed(2) + ' USD';
    if (displayCurrency === 'EUR' && exchangeRates?.EUR) return (val / exchangeRates.EUR).toFixed(2) + ' EUR';
    return val.toFixed(2) + ' AZN';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fadeIn">
      {onBack && (
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          <span>←</span> {t('miscWidgets.priceCalculator.back')}
        </button>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-label-primary tracking-tight flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary-500" strokeWidth={2.5} />
          {t('miscWidgets.priceCalculator.title')}
        </h1>
        <p className="text-slate-500 mt-2 font-medium">{t('miscWidgets.priceCalculator.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Destination */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-700 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary-500" />
            {t('miscWidgets.priceCalculator.destination')}
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-medium text-slate-700 bg-white"
          >
            <option value="">{t('miscWidgets.priceCalculator.selectPlaceholder')}</option>
            {Object.keys(distances).map(dest => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
          </select>
        </div>

        {/* Tour Type */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-700 flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary-500" />
            {t('miscWidgets.priceCalculator.tourType')}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTourType('daily')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold ${
                tourType === 'daily' 
                  ? 'border-primary-500 bg-primary-500/5 text-primary-500' 
                  : 'border-slate-200 text-slate-500 hover:border-primary-500/50'
              }`}
            >
              <span className="text-2xl">🥾</span>
              {t('miscWidgets.priceCalculator.dailyTour')}
            </button>
            <button
              onClick={() => setTourType('camp')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold ${
                tourType === 'camp' 
                  ? 'border-primary-500 bg-primary-500/5 text-primary-500' 
                  : 'border-slate-200 text-slate-500 hover:border-primary-500/50'
              }`}
            >
              <span className="text-2xl">⛺</span>
              {t('miscWidgets.priceCalculator.campTour')}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            {t('miscWidgets.priceCalculator.participantCount')}
          </label>
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200 w-fit">
            <button 
              onClick={() => setParticipants(p => Math.max(1, p - 1))}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-100 text-lg font-bold text-slate-700 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-slate-800 text-xl w-12 text-center">{participants}</span>
            <button 
              onClick={() => setParticipants(p => Math.min(50, p + 1))}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-100 text-lg font-bold text-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Food Options */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <label className="font-bold text-slate-700 flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            {t('miscWidgets.priceCalculator.foodChoice')}
          </label>
          
          {tourType === 'daily' ? (
            <div className="flex flex-col gap-3 mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="dailyFood" 
                  checked={dailyFood === 'kend'}
                  onChange={() => setDailyFood('kend')}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500" 
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.foodKendOption', { price: cfg.foodDailyKendPrice })}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="dailyFood"
                  checked={dailyFood === 'sendvic'}
                  onChange={() => setDailyFood('sendvic')}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.foodSandwichOption', { price: cfg.foodDailySendvicPrice })}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="dailyFood"
                  checked={dailyFood === 'yox'}
                  onChange={() => setDailyFood('yox')}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.foodNoneOption')}</span>
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={campBreakfast}
                  onChange={(e) => setCampBreakfast(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500" 
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.breakfastOption', { price: cfg.campBreakfastPrice })}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campLunch}
                  onChange={(e) => setCampLunch(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.lunchOption', { price: cfg.campLunchPrice })}</span>
              </label>
            </div>
          )}
        </div>

        {/* Camp Equipment */}
        {tourType === 'camp' && (
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-200 animate-fadeIn">
            <label className="font-bold text-slate-700 flex items-center gap-2 mb-2">
              <Tent className="w-5 h-5 text-primary-500" />
              {t('miscWidgets.priceCalculator.campEquipment')}
            </label>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={needTent}
                    onChange={(e) => setNeedTent(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500" 
                  />
                  <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.tentOption', { price: cfg.tentRentalPrice })}</span>
                </label>
                
                {needTent && (
                  <div className="ml-8 mt-2 flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasOwnTent}
                        onChange={(e) => setHasOwnTent(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                      <span className="ml-2 text-sm font-medium text-slate-600">{t('miscWidgets.priceCalculator.hasOwnTent')}</span>
                    </label>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={needSleepingBag}
                  onChange={(e) => setNeedSleepingBag(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500" 
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.sleepingBagOption', { price: cfg.sleepingBagRentalPrice })}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needMat}
                  onChange={(e) => setNeedMat(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-slate-700">{t('miscWidgets.priceCalculator.matOption', { price: cfg.matRentalPrice })}</span>
              </label>
            </div>
          </div>
        )}

      </div>

      {/* Results Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 bg-white border-2 border-primary-500 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-primary-500 px-5 py-4 flex items-center gap-2 text-white">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold text-lg">{t('miscWidgets.priceCalculator.costSummary')}</h3>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-600 font-medium">{t('miscWidgets.priceCalculator.bus')}</span>
              <span className="font-bold text-slate-800">{formatMoney(costs?.ppBus)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-600 font-medium">{t('miscWidgets.priceCalculator.guide')}</span>
              <span className="font-bold text-slate-800">{formatMoney(costs?.ppGuide)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-600 font-medium">{t('miscWidgets.priceCalculator.food')}</span>
              <span className="font-bold text-slate-800">{formatMoney(costs?.ppFood)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-600 font-medium">{t('miscWidgets.priceCalculator.equipment')}</span>
              <span className="font-bold text-slate-800">{formatMoney(costs?.ppEq)}</span>
            </div>

            <div className="mt-2 bg-primary-500/10 p-4 rounded-xl flex flex-col gap-2 border border-primary-500/20">
              <div className="flex justify-between items-center">
                <span className="text-primary-500 font-bold">{t('miscWidgets.priceCalculator.perPerson')}</span>
                <span className="font-extrabold text-label-primary text-xl">{formatMoney(costs?.ppTotal)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-700 font-bold">{t('miscWidgets.priceCalculator.groupTotal')}</span>
                <span className="font-extrabold text-label-primary text-xl">{formatMoney(costs?.groupTotal)}</span>
              </div>
              <span className="text-xs text-label-tertiary font-medium self-end">{t('miscWidgets.priceCalculator.forPeopleCount', { count: participants })}</span>
            </div>

            <div className="mt-4 flex items-start gap-2 bg-slate-50 p-3 rounded-lg text-xs text-slate-500 font-medium">
              <Info className="w-4 h-4 shrink-0 text-primary-500 mt-0.5" />
              <p>{t('miscWidgets.priceCalculator.disclaimer')}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
};