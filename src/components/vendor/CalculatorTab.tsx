import React, { useEffect, useState } from 'react';
import { Tour, TourCategory, TourSlot, User, GuideCalculatorConfig, DEFAULT_GUIDE_CALCULATOR_CONFIG, SavedGuideCalculation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Calculator, Tags, Settings, ChevronDown, ChevronUp, Save, Trash2, FileSpreadsheet, FileText } from 'lucide-react';

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

// Shared shape for Excel/PDF export, used both for the live in-progress calculation (which has
// every sub-line: base pay, bonus, qty x unit price per item) and for a saved history row (which
// only kept item-level totals). Optional fields are simply omitted for a saved row — the CSV/PDF
// builders render one clean total line instead of a misleading "0.00 AZN" sub-breakdown when a
// field is missing.
interface CalcExportData {
  tourName: string;
  slotDate?: string;
  participants: number;
  pricePerPerson: number;
  durationDays: number;
  tier: GuideTier;
  tierLabel: string;
  mainGuidePayment?: number;
  mainGuideSecondBonus?: number;
  mainBonusShare?: number;
  mainGuideTotal: number;
  assistantGuidePayment?: number;
  assistantGuideSecondBonus?: number;
  assistantBonusShare?: number;
  assistantGuideTotal: number;
  hasThirdGuide?: boolean;
  guideTotal: number;
  busPrice: number;
  nivaQty?: number; nivaUnitPrice?: number; nivaTotal: number;
  uazQty?: number; uazUnitPrice?: number; uazTotal: number;
  gaz66Qty?: number; gaz66UnitPrice?: number; gaz66Total: number;
  sandwichQty?: number; sandwichUnitPrice?: number; sandwichTotal: number;
  villageLunchQty?: number; villageLunchUnitPrice?: number; villageLunchTotal: number;
  villageTeaTotal: number;
  nationalParkQty?: number; nationalParkUnitPrice?: number; nationalParkTotal: number;
  otherCostsTotal: number;
  collected: number;
  netIncome: number;
}

const safeFileBaseFromName = (name: string) =>
  name.replace(/[^\p{L}\p{N} ]/gu, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'hesablama';

const qtyDetail = (qty?: number, price?: number) => (qty !== undefined && price !== undefined) ? ` (${qty} x ${price.toFixed(2)} AZN)` : '';

// Line-by-line breakdown of exactly where the money went. Shared between the live calculator
// export and a saved-row export — see CalcExportData's doc comment for why fields are optional.
function buildCsvRows(data: CalcExportData): (string | number)[][] {
  const rows: (string | number)[][] = [];
  rows.push(['Bələdçi Ödənişi və Net Gəlir Hesablaması']);
  rows.push([data.tourName + (data.slotDate ? ` — ${data.slotDate}` : '')]);
  rows.push([]);
  rows.push(['Tur Məlumatları']);
  rows.push(['İştirakçı sayı', data.participants]);
  rows.push(['Turun qiyməti (nəfər başına)', data.pricePerPerson.toFixed(2)]);
  rows.push(['Tur müddəti (gün)', data.durationDays]);
  rows.push(['Bələdçi qiymət kateqoriyası', data.tierLabel]);
  rows.push([]);
  rows.push(['Bələdçilərə Ödəniş']);
  if (data.mainGuidePayment !== undefined) {
    rows.push(['Əsas bələdçi — əsas ödəniş', data.mainGuidePayment.toFixed(2)]);
    rows.push(['Əsas bələdçi — ikinci bonus', (data.mainGuideSecondBonus || 0).toFixed(2)]);
    if ((data.mainBonusShare || 0) > 0) rows.push(['Əsas bələdçi — əlavə bonus payı', (data.mainBonusShare as number).toFixed(2)]);
  }
  rows.push(['Əsas bələdçiyə cəmi', data.mainGuideTotal.toFixed(2)]);
  if (data.assistantGuidePayment !== undefined) {
    rows.push([data.hasThirdGuide ? 'Köməkçi bələdçilər — əsas ödəniş' : 'Köməkçi bələdçi — əsas ödəniş', data.assistantGuidePayment.toFixed(2)]);
    rows.push(['Köməkçi — ikinci bonus', (data.assistantGuideSecondBonus || 0).toFixed(2)]);
    if ((data.assistantBonusShare || 0) > 0) rows.push(['Köməkçi — əlavə bonus payı', (data.assistantBonusShare as number).toFixed(2)]);
  }
  rows.push([data.hasThirdGuide ? 'Köməkçi bələdçilərə cəmi' : 'Köməkçi bələdçiyə cəmi', data.assistantGuideTotal.toFixed(2)]);
  rows.push(['Bələdçilərə ödəniş cəmi', data.guideTotal.toFixed(2)]);
  rows.push([]);
  rows.push(['Digər Xərclər']);
  if (data.busPrice > 0) rows.push(['Nəqliyyat', data.busPrice.toFixed(2)]);
  if (data.nivaTotal > 0) rows.push([`Niva${qtyDetail(data.nivaQty, data.nivaUnitPrice)}`, data.nivaTotal.toFixed(2)]);
  if (data.uazTotal > 0) rows.push([`UAZ${qtyDetail(data.uazQty, data.uazUnitPrice)}`, data.uazTotal.toFixed(2)]);
  if (data.gaz66Total > 0) rows.push([`Gaz-66${qtyDetail(data.gaz66Qty, data.gaz66UnitPrice)}`, data.gaz66Total.toFixed(2)]);
  if (data.sandwichTotal > 0) rows.push([`Sendviç nahar${qtyDetail(data.sandwichQty, data.sandwichUnitPrice)}`, data.sandwichTotal.toFixed(2)]);
  if (data.villageLunchTotal > 0) rows.push([`Kənd evində nahar${qtyDetail(data.villageLunchQty, data.villageLunchUnitPrice)}`, data.villageLunchTotal.toFixed(2)]);
  if (data.villageTeaTotal > 0) rows.push(['Kənd evində çay süfrəsi (cəmi)', data.villageTeaTotal.toFixed(2)]);
  if (data.nationalParkTotal > 0) rows.push([`Milli park girişi${qtyDetail(data.nationalParkQty, data.nationalParkUnitPrice)}`, data.nationalParkTotal.toFixed(2)]);
  rows.push(['Digər xərclər cəmi', data.otherCostsTotal.toFixed(2)]);
  rows.push([]);
  rows.push(['Yığılan pul', data.collected.toFixed(2)]);
  rows.push(['Turdan olan net gəlir', data.netIncome.toFixed(2)]);
  return rows;
}

function buildPdfPayload(data: CalcExportData) {
  return {
    tourName: data.tourName,
    slotDate: data.slotDate,
    participants: data.participants,
    pricePerPerson: data.pricePerPerson,
    durationDays: data.durationDays,
    tier: data.tier,
    mainGuidePayment: data.mainGuidePayment,
    mainGuideSecondBonus: data.mainGuideSecondBonus,
    mainBonusShare: data.mainBonusShare,
    mainGuideTotal: data.mainGuideTotal,
    assistantGuidePayment: data.assistantGuidePayment,
    assistantGuideSecondBonus: data.assistantGuideSecondBonus,
    assistantBonusShare: data.assistantBonusShare,
    assistantGuideTotal: data.assistantGuideTotal,
    hasThirdGuide: data.hasThirdGuide,
    guideTotal: data.guideTotal,
    busPrice: data.busPrice,
    nivaQty: data.nivaQty, nivaUnitPrice: data.nivaUnitPrice, nivaTotal: data.nivaTotal,
    uazQty: data.uazQty, uazUnitPrice: data.uazUnitPrice, uazTotal: data.uazTotal,
    gaz66Qty: data.gaz66Qty, gaz66UnitPrice: data.gaz66UnitPrice, gaz66Total: data.gaz66Total,
    sandwichQty: data.sandwichQty, sandwichUnitPrice: data.sandwichUnitPrice, sandwichTotal: data.sandwichTotal,
    villageLunchQty: data.villageLunchQty, villageLunchUnitPrice: data.villageLunchUnitPrice, villageLunchTotal: data.villageLunchTotal,
    villageTeaTotal: data.villageTeaTotal,
    nationalParkQty: data.nationalParkQty, nationalParkUnitPrice: data.nationalParkUnitPrice, nationalParkTotal: data.nationalParkTotal,
    otherCostsTotal: data.otherCostsTotal, collected: data.collected, netIncome: data.netIncome,
  };
}

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
  // Sandwich lunch and village-house lunch are paid per person, so — like the offroad vehicles
  // above — they need a quantity (how many people ate) x unit price, not just a single number.
  // The tea table, by contrast, is booked as a flat whole regardless of headcount, so it stays a
  // single total field with no quantity/multiplication. No default unit price is prefilled from
  // config here (unlike offroad) — a saved default doesn't make sense for these, they vary too
  // much tour to tour, so vendors type the actual price fresh each time.
  const [sandwichQty, setSandwichQty] = useState<number | ''>('');
  const [sandwichUnitPrice, setSandwichUnitPrice] = useState<number | ''>('');
  const [villageLunchQty, setVillageLunchQty] = useState<number | ''>('');
  const [villageLunchUnitPrice, setVillageLunchUnitPrice] = useState<number | ''>('');
  const [villageTeaPrice, setVillageTeaPrice] = useState<number | ''>('');
  const [nationalParkQty, setNationalParkQty] = useState<number | ''>('');
  const [nationalParkUnitPrice, setNationalParkUnitPrice] = useState<number | ''>('');
  const [additionalBonus, setAdditionalBonus] = useState<number | ''>('');
  // A 3rd guide on the tour is automatically treated as a second assistant guide — same rate,
  // same role — so assistant-side pay scales by count rather than needing a separate rate tier.
  const [hasThirdGuide, setHasThirdGuide] = useState(false);
  const [netGuideTotalOverride, setNetGuideTotalOverride] = useState<number | '' | null>(null);

  const [ratesOpen, setRatesOpen] = useState(false);
  const [rateDraft, setRateDraft] = useState<RateDraft>(config);
  const [savingRates, setSavingRates] = useState(false);

  const [savedCalculations, setSavedCalculations] = useState<SavedGuideCalculation[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingCalculation, setSavingCalculation] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  // Which saved row (if any) is expanded to show its itemized breakdown, and which saved row (if
  // any) currently has a PDF export in flight — tracked per-id, not a single boolean, so exporting
  // one row's PDF doesn't disable every other row's button.
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
  const [exportingSavedPdfId, setExportingSavedPdfId] = useState<string | null>(null);

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
  };

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

  useEffect(() => {
    if (!tourId) { setSavedCalculations([]); return; }
    setLoadingSaved(true);
    fetch(`/api/guide-calculations?tourId=${encodeURIComponent(tourId)}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => setSavedCalculations(Array.isArray(data.calculations) ? data.calculations : []))
      .catch(() => setSavedCalculations([]))
      .finally(() => setLoadingSaved(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, operatorToken]);

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
  const sandwichTotal = resolveNum(sandwichQty) * resolveNum(sandwichUnitPrice);
  const villageLunchTotal = resolveNum(villageLunchQty) * resolveNum(villageLunchUnitPrice);
  // Tea table is a flat total, not multiplied by participant count.
  const villageTeaTotal = resolveNum(villageTeaPrice);
  const nationalParkTotal = resolveNum(nationalParkQty) * resolveNum(nationalParkUnitPrice);
  const foodTotal = sandwichTotal + villageLunchTotal + villageTeaTotal + nationalParkTotal;
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

  const handleSaveCalculation = async () => {
    if (!selectedTour) return;
    setSavingCalculation(true);
    try {
      const payload = {
        tourId: selectedTour.id,
        tourName: selectedTour.name,
        slotId: selectedSlot?.id,
        slotDate: selectedSlot?.startDate,
        participants: participantsNum,
        pricePerPerson: pricePerPersonNum,
        durationDays,
        tier,
        mainGuideTotal,
        assistantGuideTotal,
        guideTotal: netGuideTotal,
        busPrice: busPriceNum,
        nivaTotal,
        uazTotal,
        gaz66Total,
        sandwichTotal,
        villageLunchTotal,
        villageTeaTotal,
        nationalParkTotal,
        otherCostsTotal,
        collected,
        netIncome,
      };
      const response = await fetch('/api/guide-calculations', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setSavedCalculations(prev => [data.calculation, ...prev]);
      if (onShowNotification) onShowNotification(t('vendorCalculator.saved.saveSuccess'), 'success');
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.saved.saveError'), 'error');
    } finally {
      setSavingCalculation(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Excel-compatible export — a CSV opens directly in Excel with correct AZ characters (UTF-8
  // BOM) and needs no extra dependency.
  const downloadCsv = (data: CalcExportData) => {
    const csvContent = buildCsvRows(data)
      .map(row => row.map(cell => {
        const s = String(cell ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\r\n');
    // Leading BOM so Excel detects UTF-8 and renders Ə/ə/ı/ş/ç/ğ/ö/ü correctly instead of mojibake.
    downloadBlob(new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' }), `${safeFileBaseFromName(data.tourName)}.csv`);
  };

  const downloadPdf = async (data: CalcExportData) => {
    const response = await fetch('/api/guide-calculations/pdf', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(buildPdfPayload(data)),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'PDF export failed');
    }
    const blob = await response.blob();
    downloadBlob(blob, `${safeFileBaseFromName(data.tourName)}.pdf`);
  };

  const tierLabelFor = (tierValue: GuideTier) =>
    tierValue === 'peak' ? t('vendorCalculator.tier.peak') : tierValue === 'camp' ? t('vendorCalculator.tier.camp') : t('vendorCalculator.tier.hiking');

  const buildLiveExportData = (): CalcExportData => ({
    tourName: selectedTour!.name,
    slotDate: selectedSlot?.startDate,
    participants: participantsNum,
    pricePerPerson: pricePerPersonNum,
    durationDays,
    tier,
    tierLabel,
    mainGuidePayment, mainGuideSecondBonus, mainBonusShare, mainGuideTotal,
    assistantGuidePayment, assistantGuideSecondBonus, assistantBonusShare, assistantGuideTotal, hasThirdGuide,
    guideTotal: netGuideTotal,
    busPrice: busPriceNum,
    nivaQty: resolveNum(nivaQty), nivaUnitPrice: resolveNum(nivaUnitPrice), nivaTotal,
    uazQty: resolveNum(uazQty), uazUnitPrice: resolveNum(uazUnitPrice), uazTotal,
    gaz66Qty: resolveNum(gaz66Qty), gaz66UnitPrice: resolveNum(gaz66UnitPrice), gaz66Total,
    sandwichQty: resolveNum(sandwichQty), sandwichUnitPrice: resolveNum(sandwichUnitPrice), sandwichTotal,
    villageLunchQty: resolveNum(villageLunchQty), villageLunchUnitPrice: resolveNum(villageLunchUnitPrice), villageLunchTotal,
    villageTeaTotal,
    nationalParkQty: resolveNum(nationalParkQty), nationalParkUnitPrice: resolveNum(nationalParkUnitPrice), nationalParkTotal,
    otherCostsTotal, collected, netIncome,
  });

  // A saved row only kept item-level totals (see SavedGuideCalculation) — no qty/unit-price or
  // base/bonus sub-breakdown, so those fields are simply left undefined here.
  const buildSavedExportData = (calc: SavedGuideCalculation): CalcExportData => ({
    tourName: calc.tourName,
    slotDate: calc.slotDate,
    participants: calc.participants,
    pricePerPerson: calc.pricePerPerson,
    durationDays: calc.durationDays,
    tier: calc.tier,
    tierLabel: tierLabelFor(calc.tier),
    mainGuideTotal: calc.mainGuideTotal,
    assistantGuideTotal: calc.assistantGuideTotal,
    guideTotal: calc.guideTotal,
    busPrice: calc.busPrice,
    nivaTotal: calc.nivaTotal,
    uazTotal: calc.uazTotal,
    gaz66Total: calc.gaz66Total,
    sandwichTotal: calc.sandwichTotal,
    villageLunchTotal: calc.villageLunchTotal,
    villageTeaTotal: calc.villageTeaTotal,
    nationalParkTotal: calc.nationalParkTotal,
    otherCostsTotal: calc.otherCostsTotal,
    collected: calc.collected,
    netIncome: calc.netIncome,
  });

  const handleExportCsv = () => {
    if (!selectedTour) return;
    downloadCsv(buildLiveExportData());
  };

  const handleExportPdf = async () => {
    if (!selectedTour) return;
    setExportingPdf(true);
    try {
      await downloadPdf(buildLiveExportData());
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.export.pdfError'), 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportSavedCsv = (calc: SavedGuideCalculation) => {
    downloadCsv(buildSavedExportData(calc));
  };

  const handleExportSavedPdf = async (calc: SavedGuideCalculation) => {
    setExportingSavedPdfId(calc.id);
    try {
      await downloadPdf(buildSavedExportData(calc));
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.export.pdfError'), 'error');
    } finally {
      setExportingSavedPdfId(null);
    }
  };

  const handleDeleteCalculation = async (calc: SavedGuideCalculation) => {
    const confirmed = window.confirm(t('vendorCalculator.saved.deleteConfirm'));
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/guide-calculations/${calc.id}`, { method: 'DELETE', headers: authHeaders });
      if (!response.ok) throw new Error();
      setSavedCalculations(prev => prev.filter(c => c.id !== calc.id));
      if (onShowNotification) onShowNotification(t('vendorCalculator.saved.deleteSuccess'), 'success');
    } catch {
      if (onShowNotification) onShowNotification(t('vendorCalculator.saved.error'), 'error');
    }
  };

  const resultRow = (label: string, value: number, bold = false) => (
    <div className="flex justify-between border-b border-slate-700 pb-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={bold ? 'font-black' : 'font-bold'}>{value.toFixed(2)} AZN</span>
    </div>
  );

  // Reused for both offroad vehicles (qty of vehicles x price per vehicle) and per-person food
  // items (qty of people x price per person) — same shape, different labels.
  const offroadRow = (
    label: string,
    qty: number | '',
    setQty: (v: number | '') => void,
    unitPrice: number | '',
    setUnitPrice: (v: number | '') => void,
    total: number,
    qtyLabel: string = t('vendorCalculator.offroad.quantityLabel'),
    unitPriceLabel: string = t('vendorCalculator.offroad.unitPriceLabel')
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div className="text-xs font-bold text-slate-700">{label}</div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold text-slate-500">{qtyLabel}</label>
        {numberInput(qty, setQty, { min: 0 })}
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-semibold text-slate-500">{unitPriceLabel}</label>
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

          {/* Food & tea — sandwich/village lunch are per-person (qty x unit price, like offroad
              vehicles above); the tea table is a flat total regardless of headcount. */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700">{t('vendorCalculator.food.title')}</h4>
            {offroadRow(
              t('vendorCalculator.food.sandwichLabel'), sandwichQty, setSandwichQty, sandwichUnitPrice, setSandwichUnitPrice, sandwichTotal,
              t('vendorCalculator.food.peopleQtyLabel'), t('vendorCalculator.food.pricePerPersonLabel')
            )}
            {offroadRow(
              t('vendorCalculator.food.villageLunchLabel'), villageLunchQty, setVillageLunchQty, villageLunchUnitPrice, setVillageLunchUnitPrice, villageLunchTotal,
              t('vendorCalculator.food.peopleQtyLabel'), t('vendorCalculator.food.pricePerPersonLabel')
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="text-xs font-bold text-slate-700">{t('vendorCalculator.food.villageTeaLabel')}</div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500">{t('vendorCalculator.food.totalPriceLabel')}</label>
                {numberInput(villageTeaPrice, setVillageTeaPrice, { min: 0 })}
              </div>
            </div>
            {offroadRow(
              t('vendorCalculator.food.nationalParkLabel'), nationalParkQty, setNationalParkQty, nationalParkUnitPrice, setNationalParkUnitPrice, nationalParkTotal,
              t('vendorCalculator.food.peopleQtyLabel'), t('vendorCalculator.food.pricePerPersonLabel')
            )}
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
                {nationalParkTotal > 0 && resultRow(t('vendorCalculator.food.nationalParkLabel'), nationalParkTotal)}
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

            <div className="pt-3 border-t border-slate-700 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleExportCsv}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold min-h-[36px] px-4 flex items-center gap-1.5 justify-center rounded-lg text-xs transition border border-slate-600"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {t('vendorCalculator.export.csvButton')}
              </button>
              <button
                type="button"
                disabled={exportingPdf}
                onClick={handleExportPdf}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold min-h-[36px] px-4 flex items-center gap-1.5 justify-center rounded-lg text-xs transition border border-slate-600 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                {t('vendorCalculator.export.pdfButton')}
              </button>
              <button
                type="button"
                disabled={savingCalculation}
                onClick={handleSaveCalculation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[36px] px-4 flex items-center gap-1.5 justify-center rounded-lg text-xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {t('vendorCalculator.saved.saveButton')}
              </button>
            </div>
          </div>

          {/* History of saved calculations for this tour */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-3">{t('vendorCalculator.saved.title')}</h4>
            {loadingSaved ? (
              <p className="text-xs text-slate-400">…</p>
            ) : savedCalculations.length === 0 ? (
              <p className="text-xs text-slate-400">{t('vendorCalculator.saved.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 border-b border-slate-200">
                      <th className="py-2 pr-3">{t('vendorCalculator.saved.headers.date')}</th>
                      <th className="py-2 pr-3">{t('vendorCalculator.saved.headers.slotDate')}</th>
                      <th className="py-2 pr-3">{t('vendorCalculator.saved.headers.participants')}</th>
                      <th className="py-2 pr-3">{t('vendorCalculator.saved.headers.guideTotal')}</th>
                      <th className="py-2 pr-3">{t('vendorCalculator.saved.headers.netIncome')}</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedCalculations.map(calc => {
                      const isExpanded = expandedCalcId === calc.id;
                      return (
                        <React.Fragment key={calc.id}>
                          <tr className="border-b border-slate-100">
                            <td className="py-2 pr-3 text-slate-500">{calc.createdAt ? new Date(calc.createdAt).toLocaleDateString() : '—'}</td>
                            <td className="py-2 pr-3 text-slate-500">{calc.slotDate || '—'}</td>
                            <td className="py-2 pr-3 font-semibold text-slate-700">{calc.participants}</td>
                            <td className="py-2 pr-3">{calc.guideTotal.toFixed(2)} AZN</td>
                            <td className="py-2 pr-3 font-bold text-emerald-700">{calc.netIncome.toFixed(2)} AZN</td>
                            <td className="py-2 pr-3">
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setExpandedCalcId(isExpanded ? null : calc.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  title={t('vendorCalculator.saved.detailButton')}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <button type="button" onClick={() => handleExportSavedCsv(calc)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title={t('vendorCalculator.export.csvButton')}>
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={exportingSavedPdfId === calc.id}
                                  onClick={() => handleExportSavedPdf(calc)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50"
                                  title={t('vendorCalculator.export.pdfButton')}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => handleDeleteCalculation(calc)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600" title={t('vendorCalculator.saved.deleteButton')}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                                  <div><span className="text-slate-400">{t('vendorCalculator.inputs.participantsLabel')}:</span> <span className="font-semibold text-slate-700">{calc.participants}</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.inputs.pricePerPersonLabel')}:</span> <span className="font-semibold text-slate-700">{calc.pricePerPerson.toFixed(2)} AZN</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.inputs.durationDaysLabel')}:</span> <span className="font-semibold text-slate-700">{calc.durationDays}</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.tier.label')}:</span> <span className="font-semibold text-slate-700">{tierLabelFor(calc.tier)}</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.results.mainGuidePaymentLabel')}:</span> <span className="font-semibold text-slate-700">{calc.mainGuideTotal.toFixed(2)} AZN</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.results.assistantGuidePaymentLabel')}:</span> <span className="font-semibold text-slate-700">{calc.assistantGuideTotal.toFixed(2)} AZN</span></div>
                                  {calc.busPrice > 0 && <div><span className="text-slate-400">{t('vendorCalculator.results.busCostLabel')}:</span> <span className="font-semibold text-slate-700">{calc.busPrice.toFixed(2)} AZN</span></div>}
                                  {calc.nivaTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.offroad.niva')}:</span> <span className="font-semibold text-slate-700">{calc.nivaTotal.toFixed(2)} AZN</span></div>}
                                  {calc.uazTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.offroad.uaz')}:</span> <span className="font-semibold text-slate-700">{calc.uazTotal.toFixed(2)} AZN</span></div>}
                                  {calc.gaz66Total > 0 && <div><span className="text-slate-400">{t('vendorCalculator.offroad.gaz66')}:</span> <span className="font-semibold text-slate-700">{calc.gaz66Total.toFixed(2)} AZN</span></div>}
                                  {calc.sandwichTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.food.sandwichLabel')}:</span> <span className="font-semibold text-slate-700">{calc.sandwichTotal.toFixed(2)} AZN</span></div>}
                                  {calc.villageLunchTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.food.villageLunchLabel')}:</span> <span className="font-semibold text-slate-700">{calc.villageLunchTotal.toFixed(2)} AZN</span></div>}
                                  {calc.villageTeaTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.food.villageTeaLabel')}:</span> <span className="font-semibold text-slate-700">{calc.villageTeaTotal.toFixed(2)} AZN</span></div>}
                                  {calc.nationalParkTotal > 0 && <div><span className="text-slate-400">{t('vendorCalculator.food.nationalParkLabel')}:</span> <span className="font-semibold text-slate-700">{calc.nationalParkTotal.toFixed(2)} AZN</span></div>}
                                  <div><span className="text-slate-400">{t('vendorCalculator.results.otherCostsTotalLabel')}:</span> <span className="font-semibold text-slate-700">{calc.otherCostsTotal.toFixed(2)} AZN</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.results.collectedLabel')}:</span> <span className="font-semibold text-slate-700">{calc.collected.toFixed(2)} AZN</span></div>
                                  <div><span className="text-slate-400">{t('vendorCalculator.results.netIncomeLabel')}:</span> <span className="font-bold text-emerald-700">{calc.netIncome.toFixed(2)} AZN</span></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
