'use client';
import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Thermometer, Calendar } from 'lucide-react';
import { fetchWeatherForDate, WeatherInfo } from '../utils/weather';
import { useLanguage } from '../i18n/LanguageContext';

interface TourWeatherForecastProps {
  dates: string[];
  region: string;
  variant?: 'compact' | 'detailed';
}

export const TourWeatherForecast: React.FC<TourWeatherForecastProps> = ({ dates, region, variant = 'compact' }) => {
  const { t, language } = useLanguage();
  const [forecasts, setForecasts] = useState<Record<string, WeatherInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      if (dates.length === 0) return;
      setLoading(true);
      const results: Record<string, WeatherInfo> = {};
      
      // Fetch in parallel
      const promises = dates.map(async (date) => {
        try {
          const info = await fetchWeatherForDate(date, region);
          results[date] = info;
        } catch (e) {
          // Fallback
          results[date] = {
            tempMin: 12,
            tempMax: 22,
            labelKey: 'fallback',
            emoji: '⛅',
            isRealLive: false
          };
        }
      });

      await Promise.all(promises);
      if (active) {
        setForecasts(results);
        setLoading(false);
      }
    };

    fetchAll();
    return () => {
      active = false;
    };
  }, [dates, region]);

  // Format Azeri months
  const formatAzeriDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      const monthKeys = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthName = t(`miscWidgets.tourWeatherForecast.months.${monthKeys[monthNum - 1]}`);
      return `${day} ${monthName} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (dates.length === 0) {
    return (
      <div className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 p-2 rounded-lg flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>{t('miscWidgets.tourWeatherForecast.noFutureDates')}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-emerald-700 animate-pulse tracking-wide font-sans">{t('miscWidgets.tourWeatherForecast.loading')}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-1.5 pt-1">
        <span className="text-[9px] font-black text-slate-400 block tracking-wider font-sans">{t('miscWidgets.tourWeatherForecast.activeDatesLabel')}</span>
        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
          {dates.map((date, idx) => {
            const forecast = forecasts[date];
            if (!forecast) return null;
            const conditionLabel = t(`miscWidgets.tourWeatherForecast.conditions.${forecast.labelKey}`);
            return (
              <div
                key={date}
                className="flex items-center justify-between text-[11px] bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 p-1.5 px-2.5 rounded-lg transition-colors gap-2"
              >
                {/* Date and active status */}
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                  <span>{formatAzeriDate(date)}</span>
                </div>

                {/* Weather forecast */}
                <div className="flex items-center gap-1">
                  <span className="text-sm shrink-0" title={conditionLabel}>{forecast.emoji}</span>
                  <span className="text-slate-600 font-extrabold text-[10px]" title={t('miscWidgets.tourWeatherForecast.minMaxTempTitle')}>
                    {forecast.tempMin}° / {forecast.tempMax}°C
                  </span>
                  <span className="text-slate-400 font-medium text-[9px] hidden sm:inline">
                    ({conditionLabel})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed view for detail modal / page
  return (
    <div className="space-y-2.5 bg-cyan-50/20 hover:bg-cyan-50/30 border border-sky-100/75 p-4 rounded-2xl transition duration-300 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-sky-600" />
          <h4 className="text-[11px] font-extrabold text-sky-900 tracking-widest">
            {t('miscWidgets.tourWeatherForecast.detailedHeading')}
          </h4>
        </div>
        <span className="text-[8px] font-black text-sky-600 bg-sky-100 border border-sky-200/40 rounded px-1.5 py-0.5 tracking-wider animate-pulse">
          {t('miscWidgets.tourWeatherForecast.liveOpenMeteo')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {dates.map((date) => {
          const forecast = forecasts[date];
          if (!forecast) return null;
          const conditionLabel = t(`miscWidgets.tourWeatherForecast.conditions.${forecast.labelKey}`);
          // Azerbaijani uppercasing needs 'ı' -> 'İ' (JS's default toUpperCase produces plain 'I'); other languages must not go through this substitution.
          const conditionLabelUpper = language === 'az'
            ? conditionLabel.toUpperCase().replace(/I/g, 'İ')
            : conditionLabel.toUpperCase();
          return (
            <div
              key={date}
              className="flex items-center justify-between bg-white border border-slate-150 p-2.5 rounded-xl hover:border-sky-300/80 hover:shadow-2xs transition group"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-extrabold tracking-wider">{t('miscWidgets.tourWeatherForecast.tourDate')}</span>
                <span className="text-[11px] font-black text-slate-800">{formatAzeriDate(date)}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-2xl pt-0.5" title={conditionLabel}>{forecast.emoji}</span>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-black text-slate-800 tracking-tight">
                    {forecast.tempMin}° ➡️ {forecast.tempMax}°C
                  </span>
                  <span className="text-[9px] text-slate-500 font-extrabold tracking-wide">
                    {conditionLabelUpper}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};