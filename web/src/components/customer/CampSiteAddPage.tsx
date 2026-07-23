'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Tent, Award } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { CampSiteForm } from './CampSiteForm';
import { CampPointsChecker } from './CampPointsChecker';
import NotFoundPage from '../NotFoundPage';

interface CampSiteAddPageProps {
  onBack: () => void;
}

// Dedicated "add a camp site" page: the reward banner, the submission form and the points
// checker live here so the main /camp-sites map page stays clean for regular visitors.
export const CampSiteAddPage: React.FC<CampSiteAddPageProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState<{ pointsPerSite: number; threshold: number }>({ pointsPerSite: 10, threshold: 100 });
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/camp-sites/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Number(data.pointsPerSite) > 0 && Number(data.threshold) > 0) {
          setConfig({ pointsPerSite: Number(data.pointsPerSite), threshold: Number(data.threshold) });
        }
        setFeatureEnabled(!data || data.enabled !== false);
      })
      .catch(() => setFeatureEnabled(true)); /* config endpoint down — don't hide the page */
  }, []);

  const seo = useMemo(() => ({
    title:
      language === 'en' ? 'Add a Camp Site | Gotabiat'
      : language === 'ru' ? 'Добавить кемпинг | Gotabiat'
      : 'Yeni Kamp Yeri Əlavə Et | Gotabiat',
    description:
      language === 'en' ? 'Share a camping spot you know in Azerbaijan — every approved spot earns you points toward a free tour.'
      : language === 'ru' ? 'Поделитесь известным вам местом для кемпинга в Азербайджане — каждое одобренное место приносит баллы к бесплатному туру.'
      : 'Azərbaycanda bildiyiniz kamp yerini paylaşın — hər təsdiqlənən yer sizə pulsuz tura doğru xal qazandırır.',
  }), [language]);

  if (featureEnabled === false) {
    return <NotFoundPage />;
  }
  if (featureEnabled === null) {
    return <div className="bg-slate-50 min-h-screen" />;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-text-muted hover:text-brand-primary transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('campSites.addPage.backToList')}
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-text-main flex items-center gap-2.5">
          <Tent className="w-7 h-7 text-brand-accent" />
          {t('campSites.addPage.title')}
        </h1>
        <p className="text-sm text-brand-text-muted mt-1 mb-5">{t('campSites.addPage.subtitle')}</p>

        {/* Reward banner — only shown here, to the people it actually concerns */}
        <div className="bg-brand-primary text-white rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 shadow-sm">
          <Award className="w-6 h-6 text-brand-accent shrink-0" />
          <p className="text-sm font-semibold leading-snug">
            {t('campSites.page.rewardBanner', { points: config.pointsPerSite, threshold: config.threshold })}
          </p>
        </div>

        <CampSiteForm pointsPerSite={config.pointsPerSite} />

        <div className="mt-6">
          <CampPointsChecker />
        </div>
      </div>
    </div>
  );
};