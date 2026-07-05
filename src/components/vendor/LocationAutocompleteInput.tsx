import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, isGoogleMapsConfigured } from '../../utils/googleMapsLoader';
import { useLanguage } from '../../i18n/LanguageContext';

interface LocationAutocompleteInputProps {
  label: string;
  value: string;
  lat?: number;
  lng?: number;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  required?: boolean;
}

// Address field for "Görüş Yeri": as the vendor types, Google Places suggests real addresses;
// picking one drops a pin on a small preview map and stores lat/lng alongside the text. Falls
// back to a plain text input (no crash, no silent data loss) if the Maps API key isn't
// configured for this environment.
export function LocationAutocompleteInput({ label, value, lat, lng, onChange, placeholder, required }: LocationAutocompleteInputProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setMapsError(t('vendorMisc.locationAutocompleteInput.notConfigured'));
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then(() => { if (!cancelled) setMapsReady(true); })
      .catch((err) => { if (!cancelled) setMapsError(err.message || t('vendorMisc.locationAutocompleteInput.loadFailed')); });
    return () => { cancelled = true; };
  }, []);

  // Attach Places Autocomplete to the text input once the script is loaded.
  useEffect(() => {
    if (!mapsReady || !inputRef.current || !window.google) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'name', 'geometry'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const newLat = place.geometry?.location?.lat();
      const newLng = place.geometry?.location?.lng();
      const address = place.formatted_address || place.name || inputRef.current?.value || '';
      onChange(address, newLat, newLng);
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // Render/update the small preview map + marker whenever coordinates are set.
  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || !window.google || lat === undefined || lng === undefined) return;
    const position = { lat, lng };
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      mapRef.current.setCenter(position);
    }
    if (markerRef.current) {
      (markerRef.current as google.maps.Marker).setPosition?.(position);
    } else {
      markerRef.current = new window.google.maps.Marker({ position, map: mapRef.current });
    }
  }, [mapsReady, lat, lng]);

  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{label}</label>
      <input
        ref={inputRef}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value, lat, lng)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
      />
      {mapsError ? (
        <p className="text-[10px] text-slate-400 italic mt-1">
          {t('vendorMisc.locationAutocompleteInput.mapUnavailable', { error: mapsError })}
        </p>
      ) : lat !== undefined && lng !== undefined ? (
        <div ref={mapContainerRef} className="w-full h-40 mt-2 rounded-lg border border-slate-200 overflow-hidden" />
      ) : mapsReady ? (
        <p className="text-[10px] text-slate-400 italic mt-1">{t('vendorMisc.locationAutocompleteInput.startTyping')}</p>
      ) : null}
    </div>
  );
}
