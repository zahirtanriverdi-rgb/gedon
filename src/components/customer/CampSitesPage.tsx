import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import maplibregl from 'maplibre-gl';
import { ArrowLeft, Tent, Plus, MapPin, ExternalLink, X, Award } from 'lucide-react';
import { CampSite } from '../../types';
import { createSatelliteStyle } from '../../utils/mapStyles';
import { useLanguage } from '../../i18n/LanguageContext';
import { CampSiteFormModal } from './CampSiteFormModal';
import { CampPointsChecker } from './CampPointsChecker';
import NotFoundPage from '../NotFoundPage';

// Azerbaijan-wide default view for the camp sites map.
const AZ_CENTER: [number, number] = [47.6, 40.3];
const AZ_ZOOM = 6.3;

interface CampSitesPageProps {
  onBack: () => void;
  onShowNotification?: (message: string, type?: string) => void;
}

export const CampSitesPage: React.FC<CampSitesPageProps> = ({ onBack, onShowNotification }) => {
  const { t, language } = useLanguage();
  const [campSites, setCampSites] = useState<CampSite[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [selectedSite, setSelectedSite] = useState<CampSite | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [config, setConfig] = useState<{ pointsPerSite: number; threshold: number }>({ pointsPerSite: 10, threshold: 100 });
  // null = config still loading; false = admin switched the feature off → behave like a
  // page that doesn't exist (matches the hidden header button).
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const loadCampSites = async () => {
    try {
      const res = await fetch('/api/camp-sites');
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setCampSites(Array.isArray(data.campSites) ? data.campSites : []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    loadCampSites();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureEnabled]);

  // Markers follow the loaded list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = campSites.map((site) => {
      const el = document.createElement('div');
      el.className = 'w-9 h-9 bg-brand-accent border-2 border-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/></svg>`;
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
    // featureEnabled is a dep so markers land even when the map is created after the list loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campSites, featureEnabled]);

  const focusSite = (site: CampSite) => {
    setSelectedSite(site);
    mapRef.current?.flyTo({ center: [site.lon, site.lat], zoom: 13 });
  };

  const seo = useMemo(() => ({
    title:
      language === 'en' ? 'Camp Sites in Azerbaijan | GedəkGörək'
      : language === 'ru' ? 'Кемпинги Азербайджана | GedəkGörək'
      : 'Azərbaycanda Kamp Yerləri | GedəkGörək',
    description:
      language === 'en' ? 'Community-shared and verified camping spots across Azerbaijan — explore the map, get directions, and add your own favourite camp site.'
      : language === 'ru' ? 'Проверенные места для кемпинга по всему Азербайджану — изучайте карту, стройте маршруты и добавляйте свои любимые стоянки.'
      : 'Azərbaycan üzrə icmanın paylaşdığı və yoxlanılmış kamp yerləri — xəritəni kəşf edin, yol tarifi alın və öz sevimli kamp yerinizi əlavə edin.',
  }), [language]);

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
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-text-muted hover:text-brand-primary transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              GedəkGörək
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-text-main flex items-center gap-2.5">
              <Tent className="w-7 h-7 text-brand-accent" />
              {t('campSites.page.title')}
            </h1>
            <p className="text-sm text-brand-text-muted mt-1">{t('campSites.page.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm px-5 py-3 rounded-full shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('campSites.page.addButton')}
          </button>
        </div>

        {/* Reward banner */}
        <div className="bg-brand-primary text-white rounded-2xl px-5 py-4 mb-5 flex items-center gap-3 shadow-sm">
          <Award className="w-6 h-6 text-brand-accent shrink-0" />
          <p className="text-sm font-semibold leading-snug">
            {t('campSites.page.rewardBanner', { points: config.pointsPerSite, threshold: config.threshold })}
          </p>
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
                  href={`https://www.openstreetmap.org/?mlat=${selectedSite.lat}&mlon=${selectedSite.lon}#map=15/${selectedSite.lat}/${selectedSite.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-full transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('campSites.page.directionsOsm')}
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
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-brand-text-muted font-semibold mb-8">
            {t('campSites.page.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  {site.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{site.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Points checker */}
        <CampPointsChecker />
      </div>

      {showForm && (
        <CampSiteFormModal
          pointsPerSite={config.pointsPerSite}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            // The new site is pending — the public list won't include it yet, but refresh anyway
            // in case the admin approves fast.
            loadCampSites();
          }}
          onShowNotification={onShowNotification}
        />
      )}
    </div>
  );
};
