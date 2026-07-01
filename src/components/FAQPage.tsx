import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Info, Navigation, Shield, BookOpen } from 'lucide-react';

const faqs = [
  {
    category: 'Hazırlıq və Avadanlıq',
    icon: <Shield className="w-5 h-5 text-emerald-600" />,
    items: [
      {
        q: 'Tura özümüzlə nə götürməliyik?',
        a: 'Tura qatılarkən mövsümə uyğun rahat geyim, qapalı və sürüşməyən (mümkünsə hiking) ayaqqabı götürmək vacibdir. Özünüzlə yetərli miqdarda (ən azı 1.5 - 2 litr) su, enerji verici qəlyanaltılar, günəş eynəyi, papaq və ehtiyat isti geyim götürün.'
      },
      {
        q: 'Hansı ayaqqabı uyğundur?',
        a: 'Dağlıq və meşəlik ərazilər üçün altı dişli, topuğu tutan Trekking və ya Hiking botları məsləhətdir. Gündəlik idman ayaqqabıları (krasovka) sürüşmə riski yaradır və ayağı burxulmalardan qorumur.'
      }
    ]
  },
  {
    category: 'Çətinlik Dərəcələri',
    icon: <Activity className="w-5 h-5 text-emerald-600" />,
    items: [
      {
        q: 'Asan tur nə deməkdir?',
        a: 'Asan turlar adətən yüksəklik fərqi az olan, yeni başlayanlar və uşaqlar (müəyyən yaşdan yuxarı) üçün uyğun, böyük fiziki güc tələb etməyən cığırlar üzrə aparılır.'
      },
      {
        q: 'Çətin tur anlayışı nədir?',
        a: 'Çətin turlar böyük yüksəklik fərqləri, kəskin yoxuşlar və bəzən texniki maneələrlə zəngindir. Bu turlara yalnız aktiv fiziki formaya sahib və əvvəlki təcrübəsi olan iştirakçılar qatıla bilər.'
      }
    ]
  },
  {
    category: 'Terminologiya Lüğəti',
    icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
    items: [
      {
        q: 'Hiking, Trekking və Camping anlayışlarının fərqləri nələrdir?',
        a: '• Hiking: Hazır və müəyyən edilmiş cığırlarla 1 günlük təbiət yürüşüdür.\n• Trekking: Daha çətin şərtlərdə, adətən bir neçə gün davam edən və bəzən cığır olmayan ərazilərdən keçən çətin yürüşdür.\n• Camping: Gecəni təbiətdə, çadırda qalmaqla cəmləşən fəaliyyətdir.'
      }
    ]
  },
  {
    category: 'Zirvə vs Hiking',
    icon: <Navigation className="w-5 h-5 text-emerald-600" />,
    items: [
      {
        q: 'Zirvə yürüşü ilə adi hikingin fərqi nədir?',
        a: 'Zirvə yürüşü (Alpinizm) müəyyən bir dağın zirvəsinə çatmağı hədəfləyir, çox vaxt kəskin iqlim dəyişikliyi, yüksəklik xəstəliyi riski və unikal texniki ləvazimatlar (kaska, buz baltası və s.) tələb edir. Adi hiking isə daha çox mənzərə və təbiətdən zövq almaq üçün cığır boyu gəzintidir.'
      }
    ]
  },
  {
    category: 'Avadanlıq Bələdçisi',
    icon: <Info className="w-5 h-5 text-emerald-600" />,
    items: [
      {
        q: 'Gore-tex nədir və niyə dağ şəraitində vacibdir?',
        a: 'Gore-tex suya davamlı, lakin eyni zamanda nəfəs ala bilən xüsusi membran (parça) texnologiyasıdır. Dağ şəraitində hava qeyri-sabit olduğundan, yağıntıdan qorunmaq və tərləməmək üçün bu tip geyim və ayaqqabılar həyati önəm daşıyır.'
      }
    ]
  }
];

// We need to import the Activity icon if it's missing, let's just make sure all are imported
import { Activity } from 'lucide-react';

export default function FAQPage({ onBack }: { onBack: () => void }) {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn font-sans">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-emerald-600 font-bold hover:text-emerald-700 transition"
      >
        <span className="mr-2">←</span> Geri qayıt
      </button>

      <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Məlumat və FAQ</h1>
        <p className="text-slate-500 mb-8 font-medium">
          Turlara düzgün hazırlaşmaq üçün təlimatlar və ən çox verilən suallar.
        </p>

        <div className="space-y-6">
          {faqs.map((cat, cIdx) => (
            <div key={cIdx} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  {cat.icon}
                </div>
                <h2 className="text-xl font-bold text-slate-800">{cat.category}</h2>
              </div>

              <div className="space-y-3">
                {cat.items.map((item, iIdx) => {
                  const id = `${cIdx}-${iIdx}`;
                  const isOpen = openIndex === id;
                  return (
                    <div 
                      key={id} 
                      className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:border-emerald-200"
                    >
                      <button
                        onClick={() => toggleAccordion(id)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-white focus:outline-none"
                      >
                        <span className="font-bold text-slate-700 text-left pr-4">{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="px-5 pb-5 text-slate-600 leading-relaxed font-medium bg-slate-50 border-t border-slate-100 pt-3">
                          {item.a.split('\n').map((line, idx) => (
                            <React.Fragment key={idx}>
                              {line}
                              <br />
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
