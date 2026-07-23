'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ArrowLeft, Tent, Plus, MapPin, X, BadgeCheck, Navigation } from 'lucide-react';
import { CampSite } from '../../types';
import { createSatelliteStyle } from '../../utils/mapStyles';
import { useLanguage } from '../../i18n/LanguageContext';
import NotFoundPage from '../NotFoundPage';

// Azerbaijan-wide default view for the camp sites map.
const AZ_CENTER: [number, number] = [47.6, 40.3];
const AZ_ZOOM = 6.3;

interface CampSitesPageProps {
  onBack: () => void;
  onAddSite: () => void;
}

export const CampSitesPage: React.FC<CampSitesPageProps> = ({ onBack, onAddSite }) => {
  const { t, language } = useLanguage();
  const [campSites, setCampSites] = useState<CampSite[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [selectedSite, setSelectedSite] = useState<CampSite | null>(null);
  // null = feature flag still loading; false = admin switched the feature off → behave like
  // a page that doesn't exist (matches the hidden header button).
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    fetch('/api/camp-sites')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setCampSites(Array.isArray(data.campSites) ? data.campSites : []);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
    fetch('/api/camp-sites/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setFeatureEnabled(!data || data.enabled !== false))
      .catch(() => setFeatureEnabled(true)); /* config endpoint down — don't hide the page */
  }, []);

  // Map init — waits for the feature flag to confirm the page will actually render
  // (the map container div doesn't exist while the flag is loading or off).
  useEffect(() => {
    if (featureEnabled !== true) return;
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createSatelliteStyle(),
      center: AZ_CENTER,
      zoom: AZ_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => mapRef.current?.resize())
      : null;
    if (resizeObserver && mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);
    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [featureEnabled]);

  // Markers follow the loaded list. featureEnabled is a dep so markers still land when the
  // map is created after the list has already loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = campSites.map((site) => {
      const el = document.createElement('div');
      el.className = 'w-9 h-9 cursor-pointer';
      el.innerHTML = `<div class="w-full h-full bg-brand-accent border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/></svg></div>`;
      el.addEventListener('click', () => setSelectedSite(site));
      const marker = new maplibregl.Marker({ element: el }).setLngLat([site.lon, site.lat]).addTo(map);
      return marker;
    });
    if (campSites.length > 0) {
      const bounds = campSites.reduce(
        (acc, s) => acc.extend([s.lon, s.lat]),
        new maplibregl.LngLatBounds([campSites[0].lon, campSites[0].lat], [campSites[0].lon, campSites[0].lat])
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 11 });
    }
  }, [campSites, featureEnabled]);

  const focusSite = (site: CampSite) => {
    setSelectedSite(site);
    mapRef.current?.flyTo({ center: [site.lon, site.lat], zoom: 13 });
  };

  const seo = useMemo(() => ({
    title:
      language === 'en' ? 'Camp Sites in Azerbaijan | Gotabiat'
      : language === 'ru' ? 'Кемпинги Азербайджана | Gotabiat'
      : 'Azərbaycanda Kamp Yerləri | Gotabiat',
    description:
      language === 'en' ? 'Community-shared and verified camping spots across Azerbaijan — explore the map, get directions, and add your own favourite camp site.'
      : language === 'ru' ? 'Проверенные места для кемпинга по всему Азербайджану — изучайте карту, стройте маршруты и добавляйте свои любимые стоянки.'
      : 'Azərbaycan üzrə icmanın paylaşdığı və yoxlanılmış kamp yerləri — xəritəni kəşf edin, yol tarifi alın və öz sevimli kamp yerinizi əlavə edin.',
  }), [language]);

  // Small badge row shared by the detail panel and the cards.
  const renderBadges = (site: CampSite) => (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      {site.isVerified && (
        <span
          title={t('campSites.page.verifiedHint')}
          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
        >
          <BadgeCheck className="w-3 h-3" />
          {t('campSites.page.verifiedBadge')}
        </span>
      )}
      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        site.isPaid
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-sky-50 text-sky-700 border-sky-200'
      }`}>
        {t(site.isPaid ? 'campSites.page.paidBadge' : 'campSites.page.freeBadge')}
      </span>
    </div>
  );

  // Admin switched the feature off — behave exactly like a page that doesn't exist.
  if (featureEnabled === false) {
    return <NotFoundPage />;
  }
  // Flag still loading — render nothing for a moment instead of flashing the full page.
  if (featureEnabled === null) {
    return <div className="bg-slate-50 min-h-screen" />;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-text-muted hover:text-brand-primary transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Gotabiat
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-text-main flex items-center gap-2.5">
              <Tent className="w-7 h-7 text-brand-accent" />
              {t('campSites.page.title')}
            </h1>
            <p className="text-sm text-brand-text-muted mt-1">{t('campSites.page.subtitle')}</p>
          </div>
          <button
            onClick={onAddSite}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm px-5 py-3 rounded-full shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('campSites.page.addButton')}
          </button>
        </div>

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-6">
          <div ref={mapContainerRef} className="w-full h-[420px] sm:h-[500px]" />

          {/* Detail panel over the map */}
          {selectedSite && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-brand-text-main text-base leading-tight">{selectedSite.name}</h3>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                  aria-label={t('campSites.page.detailsClose')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-brand-text-muted font-semibold mt-0.5">
                {t('campSites.page.submittedBy', { name: selectedSite.submitterName })}
              </p>
              {renderBadges(selectedSite)}
              {selectedSite.photos.length > 0 && (
                <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
                  {selectedSite.photos.map((photo, i) => (
                    <img key={i} src={photo} alt={selectedSite.name} className="w-20 h-16 object-cover rounded-lg border border-slate-200 shrink-0" />
                  ))}
                </div>
              )}
              {selectedSite.description && (
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed max-h-24 overflow-y-auto">{selectedSite.description}</p>
              )}
              <div className="flex flex-col gap-1.5 mt-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSite.lat},${selectedSite.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold px-3 py-2 rounded-full transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {t('campSites.page.directionsGoogle')}
                </a>
                <a
                  href={`https://waze.com/ul?ll=${selectedSite.lat},${selectedSite.lon}&navigate=yes`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-[#33CCFF]/15 hover:bg-[#33CCFF]/25 text-sky-700 text-xs font-bold px-3 py-2 rounded-full transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {t('campSites.page.directionsWaze')}
                </a>
              </div>
            </div>
          )}
        </div>

        {loadError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl px-4 py-3 mb-6">
            {t('campSites.page.loadError')}
          </div>
        )}

        {/* Card list */}
        {campSites.length === 0 && !loadError ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-brand-text-muted font-semibold">
            {t('campSites.page.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campSites.map((site) => (
              <button
                key={site.id}
                onClick={() => focusSite(site)}
                className="text-left bg-white border border-slate-200 hover:border-brand-accent rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                {site.photos.length > 0 ? (
                  <img src={site.photos[0]} alt={site.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-emerald-50 flex items-center justify-center">
                    <Tent className="w-10 h-10 text-brand-primary/40" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-black text-brand-text-main text-sm leading-tight">{site.name}</h3>
                  <p className="text-[11px] text-brand-text-muted font-semibold mt-1">
                    {t('campSites.page.submittedBy', { name: site.submitterName })}
                  </p>
                  {renderBadges(site)}
                  {site.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{site.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};