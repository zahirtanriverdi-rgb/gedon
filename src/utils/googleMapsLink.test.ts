import { describe, it, expect } from 'vitest';
import { extractCoordsFromGoogleMapsUrl, isShortGoogleMapsLink } from './googleMapsLink';

describe('extractCoordsFromGoogleMapsUrl', () => {
  it('prefers the !3d!4d place pin over the @map-center', () => {
    const url = 'https://www.google.com/maps/place/Xinaliq/@41.20,48.20,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.178900!4d48.134100!16s';
    expect(extractCoordsFromGoogleMapsUrl(url)).toEqual({ lat: 41.1789, lon: 48.1341 });
  });

  it('parses q= coordinate params', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://maps.google.com/?q=40.4093,46.3312')).toEqual({ lat: 40.4093, lon: 46.3312 });
    expect(extractCoordsFromGoogleMapsUrl('https://www.google.com/maps?q=40.4093, 46.3312&z=15')).toEqual({ lat: 40.4093, lon: 46.3312 });
  });

  it('parses the @lat,lon map center', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://www.google.com/maps/@41.3066,47.3053,15z')).toEqual({ lat: 41.3066, lon: 47.3053 });
  });

  it('parses /maps/search/ paths and plain pasted coordinates', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://www.google.com/maps/search/40.784,+48.380')).toEqual({ lat: 40.784, lon: 48.38 });
    expect(extractCoordsFromGoogleMapsUrl('41.1789, 48.1341')).toEqual({ lat: 41.1789, lon: 48.1341 });
  });

  it('unwraps consent-page continue params', () => {
    const inner = encodeURIComponent('https://www.google.com/maps?q=40.5,48.0');
    expect(extractCoordsFromGoogleMapsUrl(`https://consent.google.com/m?continue=${inner}`)).toEqual({ lat: 40.5, lon: 48.0 });
  });

  it('rejects out-of-range and coordinate-free inputs', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://www.google.com/maps?q=140.5,48.0')).toBeNull();
    expect(extractCoordsFromGoogleMapsUrl('https://maps.app.goo.gl/AbCdEf123')).toBeNull();
    expect(extractCoordsFromGoogleMapsUrl('')).toBeNull();
    expect(extractCoordsFromGoogleMapsUrl('salam dünya')).toBeNull();
  });
});

describe('isShortGoogleMapsLink', () => {
  it('recognises Google short-link hosts', () => {
    expect(isShortGoogleMapsLink('https://maps.app.goo.gl/AbCdEf123')).toBe(true);
    expect(isShortGoogleMapsLink('https://goo.gl/maps/AbCdEf123')).toBe(true);
    expect(isShortGoogleMapsLink('https://www.google.com/maps?q=1,2')).toBe(false);
    expect(isShortGoogleMapsLink('not a url')).toBe(false);
  });
});
