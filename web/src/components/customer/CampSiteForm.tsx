'use client';
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { X, ImagePlus, ShieldCheck, CheckCircle2, Link2 } from 'lucide-react';
import { createSatelliteStyle } from '../../utils/mapStyles';
import { extractCoordsFromGoogleMapsUrl } from '../../utils/googleMapsLink';
import { useLanguage } from '../../i18n/LanguageContext';

const AZ_CENTER: [number, number] = [47.6, 40.3];
const MAX_PHOTOS = 3;

// Downscale a picked image to max 1280px JPEG so the base64 POST body stays small.
// Exported for reuse by the admin camp-site create form.
export async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

interface CampSiteFormProps {
  pointsPerSite: number;
  onSubmitted?: () => void;
}

// Inline submission form card used by the /camp-sites/add page (public, captcha-gated).
export const CampSiteForm: React.FC<CampSiteFormProps> = ({ pointsPerSite, onSubmitted }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gmapsUrl, setGmapsUrl] = useState('');
  const [gmapsStatus, setGmapsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pinMapContainerRef = useRef<HTMLDivElement | null>(null);
  const pinMapRef = useRef<maplibregl.Map | null>(null);
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);

  const fetchCaptchaChallenge = async () => {
    setCaptchaAnswer('');
    try {
      const res = await fetch('/api/whatsapp/captcha');
      const data = await res.json();
      setCaptchaId(data.id);
      setCaptchaQuestion(data.question);
    } catch {
      setCaptchaId(null);
      setCaptchaQuestion(null);
    }
  };

  useEffect(() => {
    fetchCaptchaChallenge();
  }, []);

  // Pin-picker mini map: click places/moves the marker and fills the lat/lon inputs.
  useEffect(() => {
    if (!pinMapContainerRef.current || pinMapRef.current) return;
    const map = new maplibregl.Map({
      container: pinMapContainerRef.current,
      style: createSatelliteStyle(),
      center: AZ_CENTER,
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('click', (e) => {
      const { lng, lat: clickedLat } = e.lngLat;
      setLat(clickedLat.toFixed(6));
      setLon(lng.toFixed(6));
      if (!pinMarkerRef.current) {
        pinMarkerRef.current = new maplibregl.Marker({ color: '#C28E46' }).setLngLat([lng, clickedLat]).addTo(map);
      } else {
        pinMarkerRef.current.setLngLat([lng, clickedLat]);
      }
    });
    pinMapRef.current = map;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => pinMapRef.current?.resize())
      : null;
    if (resizeObserver && pinMapContainerRef.current) resizeObserver.observe(pinMapContainerRef.current);
    return () => {
      resizeObserver?.disconnect();
      map.remove();
      pinMapRef.current = null;
      pinMarkerRef.current = null;
    };
  }, []);

  // Manual lat/lon edits move the marker too.
  const syncMarkerFromInputs = (newLat: string, newLon: string) => {
    const latNum = Number(newLat);
    const lonNum = Number(newLon);
    const map = pinMapRef.current;
    if (!map || !Number.isFinite(latNum) || !Number.isFinite(lonNum) || !newLat || !newLon) return;
    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new maplibregl.Marker({ color: '#C28E46' }).setLngLat([lonNum, latNum]).addTo(map);
    } else {
      pinMarkerRef.current.setLngLat([lonNum, latNum]);
    }
  };

  // Pasted Google Maps link → coordinates. Full links parse locally; short links
  // (maps.app.goo.gl) are resolved by the server, which follows their redirect.
  const handleGmapsExtract = async () => {
    const url = gmapsUrl.trim();
    if (!url || gmapsStatus === 'loading') return;
    setGmapsStatus('loading');
    let coords = extractCoordsFromGoogleMapsUrl(url);
    if (!coords) {
      try {
        const res = await fetch(`/api/geo/gmaps?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          if (Number.isFinite(data.lat) && Number.isFinite(data.lon)) coords = data;
        }
      } catch {
        // Resolver unreachable — treated the same as "no coordinates found".
      }
    }
    if (coords) {
      const latStr = coords.lat.toFixed(6);
      const lonStr = coords.lon.toFixed(6);
      setLat(latStr);
      setLon(lonStr);
      syncMarkerFromInputs(latStr, lonStr);
      pinMapRef.current?.flyTo({ center: [coords.lon, coords.lat], zoom: 13 });
      setGmapsStatus('success');
    } else {
      setGmapsStatus('error');
    }
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = [];
    if (fileList) {
      const room = MAX_PHOTOS - photos.length;
      for (let i = 0; i < fileList.length && files.length < room; i++) {
        files.push(fileList[i]);
      }
    }
    e.target.value = '';
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, dataUrl] : prev));
      } catch {
        // Unreadable file — skip it silently, the user can retry with another photo.
      }
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!lat || !lon) {
      setErrorMessage(t('campSites.form.validationLocation'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/camp-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          lat: Number(lat),
          lon: Number(lon),
          photos,
          isPaid,
          submitterName: firstName,
          submitterSurname: lastName,
          submitterPhone: phone,
          captchaId,
          captchaAnswer: Number(captchaAnswer),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        onSubmitted?.();
        return;
      }
      // A consumed/expired captcha needs a fresh challenge before the next attempt.
      if (data.captchaFailed) fetchCaptchaChallenge();
      setErrorMessage(data.error || t('campSites.form.genericError'));
    } catch {
      fetchCaptchaChallenge();
      setErrorMessage(t('campSites.form.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary bg-white';

  if (submitted) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-brand-primary mx-auto mb-4" />
        <h3 className="text-xl font-black text-brand-text-main">{t('campSites.form.successTitle')}</h3>
        <p className="text-sm text-brand-text-muted mt-2 leading-relaxed">
          {t('campSites.form.successBody', { points: pointsPerSite })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7">
      <h3 className="text-lg font-black text-brand-text-main mb-1">{t('campSites.form.title')}</h3>
      <p className="text-xs text-brand-text-muted mb-5">{t('campSites.form.intro')}</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-brand-text-main mb-1.5">{t('campSites.form.nameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={t('campSites.form.namePlaceholder')} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-bold text-brand-text-main mb-1.5">{t('campSites.form.descriptionLabel')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} placeholder={t('campSites.form.descriptionPlaceholder')} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-bold text-brand-text-main mb-1.5">{t('campSites.form.locationLabel')}</label>
          <div ref={pinMapContainerRef} className="w-full h-64 rounded-xl overflow-hidden border border-slate-300" />
          <p className="text-[11px] text-brand-text-muted mt-1.5">{t('campSites.form.pinHint')}</p>

          {/* Google Maps link → coordinates */}
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-brand-text-main mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-brand-accent" />
              {t('campSites.form.gmapsLabel')}
            </label>
            <div className="flex gap-2">
              <input
                value={gmapsUrl}
                onChange={(e) => { setGmapsUrl(e.target.value); setGmapsStatus('idle'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGmapsExtract(); } }}
                type="url"
                placeholder={t('campSites.form.gmapsPlaceholder')}
                className={`flex-1 min-w-0 ${inputClass}`}
              />
              <button
                type="button"
                onClick={handleGmapsExtract}
                disabled={gmapsStatus === 'loading' || !gmapsUrl.trim()}
                className="shrink-0 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {gmapsStatus === 'loading' ? t('campSites.form.gmapsExtracting') : t('campSites.form.gmapsExtract')}
              </button>
            </div>
            {gmapsStatus === 'success' && (
              <p className="text-[11px] font-bold text-emerald-700 mt-1.5">{t('campSites.form.gmapsSuccess')}</p>
            )}
            {gmapsStatus === 'error' && (
              <p className="text-[11px] font-bold text-rose-600 mt-1.5">{t('campSites.form.gmapsError')}</p>
            )}
            {gmapsStatus === 'idle' && (
              <p className="text-[11px] text-brand-text-muted mt-1.5">{t('campSites.form.gmapsHint')}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">{t('campSites.form.latLabel')}</label>
              <input
                value={lat}
                onChange={(e) => { setLat(e.target.value); syncMarkerFromInputs(e.target.value, lon); }}
                inputMode="decimal" placeholder="40.123456" className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">{t('campSites.form.lonLabel')}</label>
              <input
                value={lon}
                onChange={(e) => { setLon(e.target.value); syncMarkerFromInputs(lat, e.target.value); }}
                inputMode="decimal" placeholder="47.123456" className={inputClass}
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
            className="w-4 h-4 accent-[#1E3F20]"
          />
          <span className="text-xs font-bold text-brand-text-main">{t('campSites.form.paidLabel')}</span>
        </label>

        <div>
          <label className="block text-xs font-bold text-brand-text-main mb-1.5">{t('campSites.form.photosLabel')}</label>
          <div className="flex items-center gap-2 flex-wrap">
            {photos.map((photo, i) => (
              <div key={i} className="relative">
                <img src={photo} alt="" className="w-20 h-16 object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow cursor-pointer"
                  aria-label={t('campSites.form.removePhoto')}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="w-20 h-16 border-2 border-dashed border-slate-300 hover:border-brand-accent rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotoPick} />
              </label>
            )}
          </div>
          <p className="text-[11px] text-brand-text-muted mt-1.5">{t('campSites.form.photoHint')}</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h4 className="text-xs font-black text-brand-text-main uppercase tracking-wide mb-1">{t('campSites.form.submitterTitle')}</h4>
          <p className="text-[11px] text-brand-text-muted mb-3">{t('campSites.form.submitterHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">{t('campSites.form.firstNameLabel')}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">{t('campSites.form.lastNameLabel')}</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} className={inputClass} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[11px] font-bold text-brand-text-muted mb-1">{t('campSites.form.phoneLabel')}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder={t('campSites.form.phonePlaceholder')} className={inputClass} />
          </div>
        </div>

        {captchaQuestion && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-bold text-brand-primary mb-2">
              <ShieldCheck className="w-4 h-4" />
              {t('campSites.form.captchaLabel', { question: captchaQuestion })}
            </label>
            <input
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^0-9-]/g, ''))}
              inputMode="numeric"
              placeholder={t('campSites.form.captchaPlaceholder')}
              className={inputClass}
            />
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-60 text-white font-bold text-sm px-6 py-3.5 rounded-full transition-colors cursor-pointer"
        >
          {submitting ? t('campSites.form.submitting') : t('campSites.form.submit')}
        </button>
      </div>
    </div>
  );
};