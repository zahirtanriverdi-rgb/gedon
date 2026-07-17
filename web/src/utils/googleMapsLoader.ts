/**
 * Loads the Google Maps JavaScript API (with the Places library) exactly once, no matter how
 * many components ask for it. Used by LocationAutocompleteInput for the "Görüş Yeri" address
 * autocomplete + pin-preview on the vendor tour forms.
 *
 * The API key is inlined at build time by Next from NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY — it
 * is a browser/Maps-JS key, meant to be used client-side and restricted by HTTP referrer in the
 * Google Cloud Console, not a server secret.
 */

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<typeof google> | null = null;

export function isGoogleMapsConfigured(): boolean {
  const key = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY : '') || '';
  return key.trim().length > 0;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps yalnız brauzerdə yüklənə bilər.'));
      return;
    }
    if (window.google?.maps?.places) {
      resolve(window.google);
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY;
    if (!apiKey) {
      reject(new Error('GOOGLE_MAPS_PLATFORM_KEY konfiqurasiya edilməyib.'));
      return;
    }

    const callbackName = '__gedekgorek_gmaps_init__';
    (window as any)[callbackName] = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Maps skripti yükləndi, amma window.google tapılmadı.'));
      delete (window as any)[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps skripti yüklənə bilmədi.'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
