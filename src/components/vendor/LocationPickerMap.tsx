import { useState, useRef, KeyboardEvent, MouseEvent } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search } from 'lucide-react';

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

// Minimalist brand-colored pin — avoids Leaflet's default marker image assets, which
// commonly break under bundlers that don't copy them automatically.
const brandPinIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;transform:translate(-50%,-100%);">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#059669" stroke="white" stroke-width="1.5">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.19 7.02 11.44a1.5 1.5 0 0 0 1.96 0C13.28 21.19 20 15.25 20 10c0-4.42-3.58-8-8-8z"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Free interactive location picker — OpenStreetMap tiles (no API key) + Nominatim
// reverse-geocoding to auto-fill the address/region field once a pin is dropped.
export function LocationPickerMap({ latitude, longitude, onLocationChange }: LocationPickerMapProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [40.4093, 49.8671]; // Baku
  const position: [number, number] | null = latitude !== undefined && longitude !== undefined ? [latitude, longitude] : null;

  const handlePick = async (lat: number, lng: number) => {
    onLocationChange(lat, lng);
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          onLocationChange(lat, lng, data.display_name as string);
        }
      }
    } catch {
      // Reverse geocoding is a convenience only — silently ignore failures, the pin/coords still saved.
    } finally {
      setIsGeocoding(false);
    }
  };

  // Plain button + Enter-key handler rather than a <form onSubmit> — this component is
  // itself embedded inside TourForm/InternationalTourForm's own <form>, and HTML doesn't
  // support nested forms (the browser silently flattens them, which made this search
  // trigger the OUTER tour form's submit instead of the location search).
  const handleSearch = async (e?: KeyboardEvent | MouseEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Axtarış serverdən cavab vermədi.');
      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchError('Bu ada uyğun yer tapılmadı.');
        return;
      }
      const { lat, lon, display_name } = results[0];
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      onLocationChange(latNum, lonNum, display_name);
      mapRef.current?.flyTo([latNum, lonNum], 13);
    } catch {
      setSearchError('Axtarış zamanı xəta baş verdi.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 tracking-wide">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          Xəritədə Konkret Yeri Qeyd Edin
        </label>
        {isGeocoding && <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">Ünvan müəyyən edilir...</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
          placeholder="Yer adı axtar (məs: Quba Qrız, Şəki)"
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          {isSearching ? 'Axtarılır...' : 'Axtar'}
        </button>
      </div>
      {searchError && <p className="text-[10px] text-rose-600 font-semibold">{searchError}</p>}
      <div className="rounded-xl overflow-hidden border border-slate-200 h-64">
        <MapContainer
          ref={mapRef}
          center={position || defaultCenter}
          zoom={position ? 12 : 7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {position && <Marker position={position} icon={brandPinIcon} />}
        </MapContainer>
      </div>
      <p className="text-[10px] text-slate-400">
        {position
          ? `Seçilmiş koordinat: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
          : 'Xəritədə klikləyərək turun başlanğıc nöqtəsini işarələyin.'}
      </p>
    </div>
  );
}
