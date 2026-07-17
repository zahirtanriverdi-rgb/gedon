'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Navigation, Shield, BookOpen, Activity } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function FAQPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const faqs = [
    {
      category: t('customerMisc.faqPage.categories.prepEquipment'),
      icon: <Shield className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          q: t('customerMisc.faqPage.items.whatToBring.q'),
          a: t('customerMisc.faqPage.items.whatToBring.a')
        },
        {
          q: t('customerMisc.faqPage.items.whichShoes.q'),
          a: t('customerMisc.faqPage.items.whichShoes.a')
        }
      ]
    },
    {
      category: t('customerMisc.faqPage.categories.difficultyLevels'),
      icon: <Activity className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          q: t('customerMisc.faqPage.items.easyTourMeaning.q'),
          a: t('customerMisc.faqPage.items.easyTourMeaning.a')
        },
        {
          q: t('customerMisc.faqPage.items.hardTourMeaning.q'),
          a: t('customerMisc.faqPage.items.hardTourMeaning.a')
        }
      ]
    },
    {
      category: t('customerMisc.faqPage.categories.terminologyGlossary'),
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          q: t('customerMisc.faqPage.items.hikingTrekkingCamping.q'),
          a: t('customerMisc.faqPage.items.hikingTrekkingCamping.a')
        }
      ]
    },
    {
      category: t('customerMisc.faqPage.categories.summitVsHiking'),
      icon: <Navigation className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          q: t('customerMisc.faqPage.items.summitVsHiking.q'),
          a: t('customerMisc.faqPage.items.summitVsHiking.a')
        }
      ]
    },
    {
      category: t('customerMisc.faqPage.categories.equipmentGuide'),
      icon: <Info className="w-5 h-5 text-emerald-600" />,
      items: [
        {
          q: t('customerMisc.faqPage.items.goreTex.q'),
          a: t('customerMisc.faqPage.items.goreTex.a')
        }
      ]
    }
  ];

  const toggleAccordion = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 animate-fadeIn font-sans">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-emerald-600 font-bold hover:text-emerald-700 transition"
      >
        <span className="mr-2">←</span> {t('customerMisc.faqPage.backButton')}
      </button>

      <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{t('customerMisc.faqPage.title')}</h1>
        <p className="text-slate-500 mb-8 font-medium">
          {t('customerMisc.faqPage.subtitle')}
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