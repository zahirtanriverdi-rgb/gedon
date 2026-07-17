'use client';
import React, { useState } from 'react';
import { Award, Search, Gift } from 'lucide-react';
import { CampContributorStats } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

// "Xallarımı yoxla" widget on the camp sites page: phone in → contributor stats out.
export const CampPointsChecker: React.FC = () => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<CampContributorStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!phone.trim() || checking) return;
    setChecking(true);
    setErrorMessage(null);
    setStats(null);
    try {
      const res = await fetch(`/api/camp-sites/points?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStats(data);
      } else if (res.status === 429) {
        setErrorMessage(t('campSites.points.tooManyAttempts', { seconds: data.retryAfterSec || 5 }));
      } else {
        setErrorMessage(data.error || t('campSites.points.genericError'));
      }
    } catch {
      setErrorMessage(t('campSites.points.genericError'));
    } finally {
      setChecking(false);
    }
  };

  const progressPct = stats ? Math.min(100, Math.round(((stats.points % stats.threshold) / stats.threshold) * 100)) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-black text-brand-text-main">
        <Award className="w-5 h-5 text-brand-accent" />
        {t('campSites.points.checkTitle')}
      </h2>
      <p className="text-xs text-brand-text-muted mt-1 mb-4">{t('campSites.points.checkIntro')}</p>

      <div className="flex gap-2 max-w-md">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
          type="tel"
          placeholder="050 123 45 67"
          aria-label={t('campSites.points.phoneLabel')}
          className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
        />
        <button
          onClick={handleCheck}
          disabled={checking || !phone.trim()}
          className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          {checking ? t('campSites.points.checking') : t('campSites.points.checkButton')}
        </button>
      </div>

      {errorMessage && (
        <p className="text-xs font-semibold text-rose-600 mt-3">{errorMessage}</p>
      )}

      {stats && (
        <div className="mt-5 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <div className="text-2xl font-black text-brand-primary">{stats.points}</div>
              <div className="text-[11px] font-bold text-brand-text-muted uppercase tracking-wide">{t('campSites.points.points')}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <div className="text-2xl font-black text-brand-primary">{stats.approvedCount}</div>
              <div className="text-[11px] font-bold text-brand-text-muted uppercase tracking-wide">{t('campSites.points.approvedSites')}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-bold text-brand-text-muted mb-1.5">
              <span>{t('campSites.points.progress', { current: stats.points % stats.threshold, threshold: stats.threshold })}</span>
              <span>{t('campSites.points.toNextReward', { points: stats.pointsToNextReward })}</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {stats.rewardsEarned > 0 && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="flex items-start gap-2 text-xs font-bold text-brand-primary leading-relaxed">
                <Gift className="w-4 h-4 shrink-0 mt-0.5" />
                {t('campSites.points.rewardEarned')}
              </p>
              {stats.rewardsAvailable > 0 && (
                <p className="text-[11px] font-semibold text-brand-text-muted mt-1.5 ml-6">
                  {t('campSites.points.rewardsAvailable', { count: stats.rewardsAvailable })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};