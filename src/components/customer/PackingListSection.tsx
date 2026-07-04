import React from 'react';
import { Loader2 } from 'lucide-react';

// Curated packing lists shown after the simulated AI "thinking" delay, keyed by hiking experience level
const PACKING_LISTS: Record<'beginner' | 'pro', string[]> = {
  beginner: [
    'Yoxuş və enişlərdə dizlərə düşən yükü azaltmaq üçün teleskopik yürüş çubuqları',
    'Relyefə uyğun, topuğu tutan və sürüşməyən Gore-Tex membranlı peşəkar yürüş botları',
    'Cığır kənarlarındakı tikanlardan, kiçik daşlardan və nəm otlardan qorunmaq üçün yürüş qamaşları',
    'Tərləmənin qarşısını alan və tez quruyan sintetik idman geyimləri və ya yüngül termal alt paltarı',
    'Hər ehtimala qarşı, yürüşün gec saatlara qalma ehtimalı üçün alın fənəri (ehtiyat batareyaları ilə)',
    'Zirvə küləyinə qarşı boyunluq (buff) və yüngül küləkkeçirməz membran əlcəklər'
  ],
  pro: [
    'Eniş və yoxuşlarda dizləri qorumaq üçün cüt teleskopik yürüş çubuqları (baston).',
    'Daşlıq və torpaq relyefdə ayaq biləyini möhkəm saxlayan, sukeçirməyən yarımboğaz trekking botları.',
    'Zirvədəki güclü küləyə qarşı nəfəs ala bilən membran materialdan (Windstopper və ya Gore-Tex) küləklik.',
    'Nəmi bədədndən uzaqlaşdıran sürətlə quruyan sintetik idman köynəkləri və ya termal altlıq.',
    'Hər ehtimala qarşı qəfil duman və ya ləngimələr üçün ehtiyat batareyalı alın fənəri.',
    'Boynu və üzü küləkdən qorumaq üçün yüngül baf (buff) və fərdi ilk yardım dəsti.'
  ]
};

interface PackingListSectionProps {
  tourId: string;
  packingExperienceMap: Record<string, 'beginner' | 'pro' | null>;
  packingAnalyzingMap: Record<string, boolean>;
  checkedPackingItems: Record<string, boolean>;
  onSelectExperience: (tourId: string, choice: 'beginner' | 'pro') => void;
  onToggleChecked: (key: string) => void;
}

export function PackingListSection({
  tourId,
  packingExperienceMap,
  packingAnalyzingMap,
  checkedPackingItems,
  onSelectExperience,
  onToggleChecked
}: PackingListSectionProps) {
  return (
    <div className="bg-amber-50/45 border border-amber-200/60 rounded-2xl p-5 space-y-4 hover:border-amber-300/85 transition duration-300">
      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-amber-200/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎒</span>
          <div>
            <h4 className="text-xs font-black text-amber-900 tracking-widest leading-none border-b border-amber-200/20 pb-0.5">
              Ağıllı Çanta & İlkin Hazırlıq
            </h4>
            <p className="text-[10px] text-amber-800/80 font-bold mt-1">
              Sizin fərdi təcrübənizə uyğun çanta və yürüş tövsiyələri
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE QUESTION SECTION */}
      <div className="bg-white/95 border border-amber-150 p-4 rounded-xl space-y-3.5 shadow-4xs">
        <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          <span className="animate-pulse">❓</span> Bundan öncə neçə yürüşdə (hiking-də) olmusunuz?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectExperience(tourId, 'beginner')}
            className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer flex flex-col justify-between ${
              packingExperienceMap[tourId] === 'beginner'
                ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
              <span className="text-xs">🟢</span> 0 - 2 dəfə (Yeni başlayan)
            </span>
            <span className="text-[9px] text-slate-500 mt-1.5 font-medium leading-normal">
              Evdə olan rahat əşyalarla sadə hazırlıq. Bahalı avadanlığa ehtiyac yoxdur!
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectExperience(tourId, 'pro')}
            className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer flex flex-col justify-between ${
              packingExperienceMap[tourId] === 'pro'
                ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
              <span className="text-xs">⚡</span> 3 və ya daha çox (Təcrübəli)
            </span>
            <span className="text-[9px] text-slate-500 mt-1.5 font-medium leading-normal">
              Relyefə və çətinliyə xüsusi texniki səviyyə avadanlığı və qoruyucu geyim.
            </span>
          </button>
        </div>
      </div>

      {/* PACKING LIST DISPLAY AREA */}
      {packingAnalyzingMap[tourId] ? (
        <div className="bg-white border border-amber-200/60 p-6 rounded-xl text-center space-y-2.5 shadow-5xs">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            <p className="text-[10px] text-slate-500 font-bold tracking-wider">
              Təcrübəniz analiz edilir və sizə özəl çanta siyahısı hazırlanır...
            </p>
          </div>
        </div>
      ) : packingExperienceMap[tourId] ? (
        (() => {
          const userChoice = packingExperienceMap[tourId] as 'beginner' | 'pro';
          const items = PACKING_LISTS[userChoice];

          return (
            <div className="bg-white border border-amber-200/80 p-4.5 rounded-xl text-xs space-y-3 shadow-xs text-slate-850 animate-fadeIn">
              {userChoice === 'beginner' ? (
                <div className="space-y-3 bg-emerald-50/20 border border-emerald-100/70 p-4 rounded-lg">
                  <div className="flex items-center justify-between border-b border-emerald-100/40 pb-2 mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800 tracking-widest">
                      <span>🟢</span> Sizə Uyğun: Yeni Başlayan Çantası
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-1.5 py-0.5 rounded leading-none select-none">
                      Məsləhət Görülür
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item, index) => {
                      const key = `${tourId}:beginner:${index}`;
                      const checked = !!checkedPackingItems[key];
                      return (
                        <li key={index} className="flex items-start gap-2 text-[11px] font-medium">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleChecked(key)}
                            className="mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                          />
                          <span className={checked ? 'line-through text-gray-400' : 'text-slate-700'}>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="space-y-3 bg-indigo-50/15 border border-indigo-100/60 p-4 rounded-lg">
                  <div className="flex items-center justify-between border-b border-indigo-150/40 pb-2 mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-800 tracking-widest">
                      <span>⚡</span> Sizə Uyğun: Texniki Peşəkar Siyahı
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item, index) => {
                      const key = `${tourId}:pro:${index}`;
                      const checked = !!checkedPackingItems[key];
                      return (
                        <li key={index} className="flex items-start gap-2 text-[11px] font-medium">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleChecked(key)}
                            className="mt-0.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                          />
                          <span className={checked ? 'line-through text-gray-400' : 'text-slate-700'}>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="pt-2 text-[9px] text-emerald-700 font-bold border-t border-slate-100 flex items-center justify-between gap-1 leading-normal">
                <span>💚 <strong>Bələdçi Rəyi:</strong> Sizə hər zaman rahat olacaq geyim və ayaqqabılar seçin; yürüşün, fəslin ləzzətini hiss edin!</span>
                <button
                  type="button"
                  onClick={() => onSelectExperience(tourId, userChoice === 'beginner' ? 'pro' : 'beginner')}
                  className="text-[9px] text-indigo-700 font-black underline hover:text-indigo-800 cursor-pointer select-none whitespace-nowrap"
                >
                  {userChoice === 'beginner' ? "Təcrübəli siyahısına keç" : "Başlayanlar üçün keç"}
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="text-center p-4 bg-white/70 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
          💡 Yuxarıdakı suala cavab seçərək sizə özəl olan ağıllı bələdçi tövsiyələrini dərhal açın!
        </div>
      )}
    </div>
  );
}
