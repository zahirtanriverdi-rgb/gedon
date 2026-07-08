import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ParsedGpxRoute, parseStoredGpxData, calculateHaversineDistance, getRouteDurationHours } from '../utils/gpxParser';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Compass,
  Layers,
  Activity,
  Camera,
  Move
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Interpolates a lat/lon/ele position at a given progress (0-1) along the route,
 * based on real cumulative ground distance rather than raw point index — keeps
 * playback speed constant across the track regardless of how densely points were
 * recorded (steep switchbacks vs. flat straightaways).
 */
function interpolateAlongRoute(
  progress: number,
  points: [number, number, number][],
  cumDistances: number[],
  totalDistanceKm: number
): { lat: number; lon: number; ele: number } {
  const clamped = Math.min(1, Math.max(0, progress));
  if (points.length === 1 || totalDistanceKm <= 0) {
    const p = points[0];
    return { lat: p[0], lon: p[1], ele: p[2] };
  }

  const targetDistance = clamped * totalDistanceKm;

  // Binary search for the first cumulative distance >= targetDistance
  let lo = 0;
  let hi = cumDistances.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumDistances[mid] < targetDistance) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const idx1 = Math.max(1, lo);
  const idx0 = idx1 - 1;
  const segStart = cumDistances[idx0];
  const segEnd = cumDistances[idx1];
  const segLength = segEnd - segStart;
  const frac = segLength > 0 ? (targetDistance - segStart) / segLength : 0;

  const p0 = points[idx0];
  const p1 = points[idx1];

  return {
    lat: p0[0] + (p1[0] - p0[0]) * frac,
    lon: p0[1] + (p1[1] - p0[1]) * frac,
    ele: p0[2] + (p1[2] - p0[2]) * frac,
  };
}

/** Great-circle initial bearing in degrees (0-360) from point A to point B */
function computeBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/** Rotates `current` degrees towards `target` degrees by factor `t`, taking the shortest angular path */
function lerpBearing(current: number, target: number, t: number): number {
  const diff = ((target - current + 540) % 360) - 180;
  return (current + diff * t + 360) % 360;
}

interface GpsTrackVisualizerProps {
  gpxDataString: string;
}

export const GpsTrackVisualizer: React.FC<GpsTrackVisualizerProps> = ({ gpxDataString }) => {
  const { t } = useLanguage();
  const [parsed, setParsed] = useState<ParsedGpxRoute | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Parse track coordinates on change
  useEffect(() => {
    setParsed(parseStoredGpxData(gpxDataString));
  }, [gpxDataString]);

  if (!parsed) return null;

  return (
    <div className="space-y-4 font-sans w-full antialiased" id="free-maplibre-gps-visualizer-container">
      
      {/* Primary detail-card launching widget with redesigned premium branding */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition duration-300 hover:border-sky-400 shadow-sm">
        <div className="flex items-center gap-3.5 text-left w-full md:w-auto">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-xl shrink-0 border border-sky-200 animate-pulse">
            <Compass className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-extrabold tracking-widest text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                {t('miscWidgets.gpsTrackVisualizer.badgeInteractive3d')}
              </span>
              <span className="p-0.5 px-1.5 bg-sky-500 text-white font-black text-[8px] rounded uppercase">
                {t('miscWidgets.gpsTrackVisualizer.badgeNew')}
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-800 leading-tight uppercase mt-1.5">
              {t('miscWidgets.gpsTrackVisualizer.heading')}
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal max-w-md mt-1 font-medium">
              {t('miscWidgets.gpsTrackVisualizer.description')}
            </p>
          </div>
        </div>

        {/* Launch Button overlay */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto px-5 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10 shrink-0"
        >
          <span>{t('miscWidgets.gpsTrackVisualizer.openButton')}</span>
        </button>
      </div>

      {/* Immersive 3D/2D Satellite Track Visualizer Screen overlay */}
      {isOpen && (
        <GpsMapOverlay 
          parsed={parsed} 
          onClose={() => setIsOpen(false)} 
        />
      )}

    </div>
  );
};

/* ==========================================================================
   IMMERSIVE MAP OVERLAY COMPONENT - Ensures reliable ref mounting
   ========================================================================== */
interface GpsMapOverlayProps {
  parsed: ParsedGpxRoute;
  onClose: () => void;
}

const GpsMapOverlay: React.FC<GpsMapOverlayProps> = ({ parsed, onClose }) => {
  const { t } = useLanguage();
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2.0);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Real ground-distance cumulative table, used to interpolate smoothly between
  // GPX points (constant playback speed) instead of snapping point-to-point.
  const { cumDistances, totalDistanceKm } = useMemo(() => {
    const points = parsed.points;
    const cum: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const [lat1, lon1] = points[i - 1];
      const [lat2, lon2] = points[i];
      cum.push(cum[i - 1] + calculateHaversineDistance(lat1, lon1, lat2, lon2));
    }
    return { cumDistances: cum, totalDistanceKm: cum[cum.length - 1] || 0 };
  }, [parsed]);

  // Precomputed SVG elevation profile (x = distance %, y = normalized elevation)
  const elevationProfile = useMemo(() => {
    const points = parsed.points;
    if (points.length < 2 || totalDistanceKm <= 0) return { path: '', areaPath: '' };
    const elevations = points.map(p => p[2]);
    const minEle = Math.min(...elevations);
    const maxEle = Math.max(...elevations);
    const range = maxEle - minEle || 1;
    const coords = points.map((p, i) => {
      const x = (cumDistances[i] / totalDistanceKm) * 100;
      const y = 30 - ((p[2] - minEle) / range) * 28 - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const path = `M${coords.join(' L')}`;
    return { path, areaPath: `${path} L100,30 L0,30 Z` };
  }, [parsed, cumDistances, totalDistanceKm]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  const smoothedBearingRef = useRef<number>(0);
  const introActiveRef = useRef<boolean>(true);
  const elevationIndicatorRef = useRef<HTMLDivElement | null>(null);
  // Once the user manually rotates the map, stop overriding their bearing so a "free look"
  // rotate doesn't keep snapping back to the travel direction — only re-armed via the follow toggle.
  const userRotatedRef = useRef<boolean>(false);

  // Joystick: lets the user orbit the camera around the hiker marker by dragging a knob,
  // independent of the map's own drag/rotate gestures (which pan/rotate the whole map instead).
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const isJoystickActiveRef = useRef<boolean>(false);
  const joystickBearingRef = useRef<number>(0);
  const joystickPitchRef = useRef<number>(55);

  // Performance-critical DOM refs to bypass 60fps React state re-renders entirely
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const percentageTextRef = useRef<HTMLSpanElement | null>(null);
  const distanceRef = useRef<HTMLSpanElement | null>(null);
  const altitudeRef = useRef<HTMLSpanElement | null>(null);

  // Shared refs for running requestAnimationFrame loop safely
  const progressRef = useRef<number>(0);
  const mapModeRef = useRef<'3d' | '2d'>(mapMode);
  const playbackSpeedRef = useRef<number>(playbackSpeed);
  const isFollowingRef = useRef<boolean>(true);
  const isTransitioningRef = useRef<boolean>(false);

  useEffect(() => {
    mapModeRef.current = mapMode;
  }, [mapMode]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  const updateMapAndMarkerVisuals = (progress: number) => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || parsed.points.length === 0) return;

    const current = interpolateAlongRoute(progress, parsed.points, cumDistances, totalDistanceKm);
    const targetLngLat: [number, number] = [current.lon, current.lat];

    // Move marker to current interpolated position (smooth between GPX points, not snapped)
    marker.setLngLat(targetLngLat);

    // Look a short real-world distance ahead to get a stable travel heading, then
    // ease the camera bearing towards it (shortest angular path) to avoid GPS-noise jitter
    if (totalDistanceKm > 0) {
      const lookAheadKm = 0.05;
      const aheadProgress = Math.min(1, progress + lookAheadKm / totalDistanceKm);
      if (aheadProgress > progress) {
        const ahead = interpolateAlongRoute(aheadProgress, parsed.points, cumDistances, totalDistanceKm);
        if (ahead.lat !== current.lat || ahead.lon !== current.lon) {
          const targetBearing = computeBearingDeg(current.lat, current.lon, ahead.lat, ahead.lon);
          smoothedBearingRef.current = lerpBearing(smoothedBearingRef.current, targetBearing, 0.08);
        }
      }
    }

    // Joystick takes priority over everything else while the user is actively dragging it —
    // lets them orbit around the hiker regardless of follow/interaction state.
    if (isJoystickActiveRef.current) {
      if (!isTransitioningRef.current) {
        map.jumpTo({
          center: targetLngLat,
          bearing: joystickBearingRef.current,
          pitch: joystickPitchRef.current
        });
      }
    } else if (!introActiveRef.current && !isUserInteractingRef.current && !isTransitioningRef.current && isFollowingRef.current) {
      // Camera tracker helper - track position smoothly, zero spin-nausea, maximum tile sharpness.
      // Bearing is only force-applied until the user manually rotates the map (see userRotatedRef).
      map.jumpTo({
        center: targetLngLat,
        ...(userRotatedRef.current ? {} : { bearing: smoothedBearingRef.current })
      });
    }

    // Direct DOM Updates (Ultra fast, zero React re-render overhead)
    if (sliderRef.current) {
      sliderRef.current.value = progress.toString();
    }
    if (percentageTextRef.current) {
      percentageTextRef.current.textContent = `${Math.round(progress * 100)}%`;
    }
    if (distanceRef.current) {
      const accumDistance = (totalDistanceKm * progress).toFixed(1);
      distanceRef.current.textContent = t('miscWidgets.gpsTrackVisualizer.distanceLabel', { distance: accumDistance });
    }
    if (altitudeRef.current) {
      const currentAltitude = Math.round(current.ele);
      altitudeRef.current.textContent = t('miscWidgets.gpsTrackVisualizer.altitudeLabel', { altitude: currentAltitude });
    }
    if (elevationIndicatorRef.current) {
      elevationIndicatorRef.current.style.left = `${progress * 100}%`;
    }
  };

  // Initialize Maplibre instances when Overlay component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const pathPoints = parsed.points;
    if (pathPoints.length === 0) return;

    // Convert GPX points from [lat, lon, ele] to Maplibre coordinates [lon, lat]
    const coordinates = pathPoints.map(pt => [pt[1], pt[0]] as [number, number]);
    const startCoord = coordinates[0];

    // High quality Satellite imagery tile layer config - Using high availability Google tiles to bypass sandbox CORS/referer blocks
    const customSatelliteStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'satellite-tiles': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
          ],
          tileSize: 256,
          attribution: 'Map data © Google Imagery'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    // Calculate bounding box to fit the route nicely
    const bounds = coordinates.reduce((acc, coord) => {
      return acc.extend(coord);
    }, new maplibregl.LngLatBounds(startCoord, startCoord));

    // Initialize Maplibre instances with static focus point first to prevent constructor 0x0 size bugs!
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: customSatelliteStyle,
      center: startCoord,
      zoom: 13.5,
      pitch: mapMode === '3d' ? 62 : 0,
      bearing: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true } // required so the canvas can be captured for the screenshot export button
    });

    mapRef.current = map;

    // Force map size computation on next layout tick to prevent 0x0 canvas bug
    map.resize();

    // Use a robust ResizeObserver to immediately catch fixed-modal layouts sizing up
    const container = mapContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(container);
    }

    // Secondary multi-period layout triggers to guarantee rendering in active tabs or sandboxed iframe environments
    const rT1 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 50);
    const rT2 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 250);
    const rT3 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 750);
    const rT4 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 1500);

    let interactionTimeout: any = null;

    const startInteraction = () => {
      isUserInteractingRef.current = true;
      if (interactionTimeout) clearTimeout(interactionTimeout);
    };

    const endInteraction = () => {
      if (interactionTimeout) clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 5000); // Resume automatic focal tracking 5 seconds after interaction ends
    };

    // A manual rotate means the user wants to look somewhere other than "forward" —
    // stop overriding their bearing (position tracking still resumes as normal above).
    const onUserRotate = () => {
      userRotatedRef.current = true;
    };

    map.on('dragstart', startInteraction);
    map.on('zoomstart', startInteraction);
    map.on('rotatestart', startInteraction);
    map.on('rotatestart', onUserRotate);
    map.on('pitchstart', startInteraction);

    map.on('dragend', endInteraction);
    map.on('zoomend', endInteraction);
    map.on('rotateend', endInteraction);
    map.on('pitchend', endInteraction);

    // Add navigation controls (visualizing compass, zoom and 3D tilting indicator)
    const navControl = new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    });
    map.addControl(navControl, 'bottom-right');

    let fitTimeout: any = null;

    map.on('load', () => {
      if (!mapRef.current) return;

      // Instantly recalculate dimensions upon map style rendering ready state
      mapRef.current.resize();

      // Add raster DEM terrain source for real 3D mountain elevations
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        ],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      });

      // Sky layer: fills the void beyond loaded terrain edges with a gradient instead of
      // the vertical "curtain" artifact terrain rendering shows there when panning/zooming out
      map.setSky({
        'sky-color': '#88C6FC',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#ffffff',
        'horizon-fog-blend': 0.5,
        'fog-color': '#ffffff',
        'fog-ground-blend': 0.5
      });

      // Enable terrain if in '3d' mode initially (exaggerated enough for the relief to read clearly)
      if (mapMode === '3d') {
        map.setTerrain({
          source: 'terrain-dem',
          exaggeration: 1.3
        });
      }

      // Add GPX route trace line layer
      map.addSource('route-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff7300', // Brand accent orange
          'line-width': 5.5,
          'line-opacity': 0.95
        }
      });

      // Create custom elegant active hiker pin elements (Walking hiker silhouette look)
      const el = document.createElement('div');
      el.className = 'relative flex flex-col items-center justify-center';
      
      // Pulse background ring simulation
      const pulse = document.createElement('div');
      pulse.className = 'absolute w-10 h-10 bg-rose-500/35 rounded-full animate-ping';
      el.appendChild(pulse);

      // Main circular badge containing the hiking/walking person SVG
      const badge = document.createElement('div');
      badge.className = 'w-9 h-9 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center shadow-xl z-10 transition duration-300 transform hover:scale-110 cursor-pointer';
      badge.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white">
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 21.5h2.1l1.9-8.6 2.1 2V21.5h2v-7.5l-2.1-2.1.6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
        </svg>
      `;
      el.appendChild(badge);

      // Pin stem pointing downwards precisely to the path line
      const stem = document.createElement('div');
      stem.className = 'w-0.5 h-3 bg-rose-600 shadow-sm shadow-black/50 transform -translate-y-0.5';
      el.appendChild(stem);

      // Create Maplibre Marker
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
      })
      .setLngLat(startCoord)
      .addTo(map);

      markerRef.current = marker;

      // Fit map within calculated route boundaries safely
      const performFitBounds = () => {
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds, {
            padding: { top: 90, bottom: 90, left: 90, right: 90 },
            animate: false
          });
        }
      };

      performFitBounds();
      fitTimeout = setTimeout(performFitBounds, 250);

      // Start the camera already facing the direction of travel — avoids a separate
      // cinematic flyTo to a different zoom/point, which required loading a second full
      // set of tiles and made first paint noticeably slower on some networks.
      if (totalDistanceKm > 0) {
        const startPt = interpolateAlongRoute(0, parsed.points, cumDistances, totalDistanceKm);
        const aheadProgress = Math.min(1, 0.05 / totalDistanceKm);
        const aheadPt = interpolateAlongRoute(aheadProgress, parsed.points, cumDistances, totalDistanceKm);
        smoothedBearingRef.current = computeBearingDeg(startPt.lat, startPt.lon, aheadPt.lat, aheadPt.lon);
      }
      introActiveRef.current = false;

      // Perform initial render update to populate progress elements
      updateMapAndMarkerVisuals(0);
    });

    return () => {
      if (interactionTimeout) clearTimeout(interactionTimeout);
      clearTimeout(rT1);
      clearTimeout(rT2);
      clearTimeout(rT3);
      clearTimeout(rT4);
      clearTimeout(fitTimeout);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [parsed]);

  // Immediately respond to manual switches between 2D and 3D mode with smooth transitions
  useEffect(() => {
    const map = mapRef.current;
    // Also skip while the cinematic intro is still running (e.g. this effect firing on
    // initial mount) — avoids requesting yet another throwaway viewport's worth of tiles
    // before the intro's own flyTo settles, which was slowing down first paint.
    if (!map || introActiveRef.current) return;

    const progress = progressRef.current;
    const current = interpolateAlongRoute(progress, parsed.points, cumDistances, totalDistanceKm);
    const targetLngLat: [number, number] = [current.lon, current.lat];

    // Temporarily halt automatic tick jumps to let easeTo animation slide smoothly
    isTransitioningRef.current = true;

    if (mapMode === '3d') {
      try {
        if (map.getSource('terrain-dem')) {
          map.setTerrain({ source: 'terrain-dem', exaggeration: 1.3 });
        }
      } catch (err) {
        console.warn('Terrain activation failed:', err);
      }
      map.easeTo({
        center: targetLngLat,
        pitch: 55,
        bearing: smoothedBearingRef.current, // keep facing the current travel direction
        duration: 1000,
        essential: true
      });
    } else {
      try {
        map.setTerrain(null);
      } catch (err) {
        console.warn('Terrain deactivation failed:', err);
      }
      map.easeTo({
        center: targetLngLat,
        pitch: 0,
        bearing: 0,
        duration: 1000,
        essential: true
      });
    }

    const t = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1005);

    return () => {
      clearTimeout(t);
    };
  }, [mapMode]);

  // Real-time animation playback loop (Single-source dependency ticks, uninterrupted)
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Hold position updates while the cinematic intro flyTo is still swooping in
      if (introActiveRef.current) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      // Update simulation marker progression continuously
      const nextProgress = progressRef.current + (delta * 0.010 * playbackSpeedRef.current);

      if (nextProgress >= 1.0) {
        progressRef.current = 1.0;
        updateMapAndMarkerVisuals(1.0);
        setIsPlaying(false);
        setIsFinished(true);
        return; // stop the loop, show the completion summary instead of looping
      }

      progressRef.current = nextProgress;
      updateMapAndMarkerVisuals(nextProgress);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  const handleRestart = () => {
    progressRef.current = 0;
    setIsFinished(false);
    setIsPlaying(true);
    updateMapAndMarkerVisuals(0);
  };

  const handleScreenshot = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const dataUrl = map.getCanvas().toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${parsed.fileName ? parsed.fileName.replace(/\.[^/.]+$/, '') : 'route'}-3d-expedition.png`;
      link.click();
    } catch (err) {
      console.warn('Screenshot capture failed:', err);
    }
  };

  // Joystick radius in pixels the knob can travel from center before clamping
  const JOYSTICK_RADIUS = 32;

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    isJoystickActiveRef.current = true;
    joystickBearingRef.current = map.getBearing();
    joystickPitchRef.current = map.getPitch();
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // no-op: some pointer types/browsers don't support capture — drag still works via bubbling
    }
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isJoystickActiveRef.current || !joystickBaseRef.current || !joystickKnobRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;
    const dist = Math.min(JOYSTICK_RADIUS, Math.sqrt(rawDx * rawDx + rawDy * rawDy));
    const angle = Math.atan2(rawDy, rawDx);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    // Knob angle maps directly to compass bearing: up = north (0°), clockwise from there.
    const bearingDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    joystickBearingRef.current = (bearingDeg + 360) % 360;

    // Distance from center controls pitch: centered = looking down, pushed to the edge = looking
    // toward the horizon — the further you push, the more "into" the view you tilt.
    const magnitude = dist / JOYSTICK_RADIUS;
    joystickPitchRef.current = 15 + magnitude * 55;
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isJoystickActiveRef.current = false;
    userRotatedRef.current = true; // keep the view the user chose instead of snapping back
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // no-op: pointer capture may already be released
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col text-slate-100 font-sans transition-all">

      {/* Main Maplibre Map Container */}
      <div className="flex-1 relative w-full h-full bg-primary-50 overflow-hidden select-none">

        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full text-slate-900" style={{ outline: 'none' }} />

        {/* ORBIT JOYSTICK: drag the knob to rotate/tilt the camera around the hiker marker */}
        <div
          ref={joystickBaseRef}
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerUp}
          onPointerCancel={handleJoystickPointerUp}
          title={t('miscWidgets.gpsTrackVisualizer.joystickTitle')}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[30] w-20 h-20 rounded-full bg-slate-950/60 border border-white/20 backdrop-blur-md shadow-xl flex items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none"
        >
          <div
            ref={joystickKnobRef}
            className="w-9 h-9 rounded-full bg-sky-500 border-2 border-white/80 shadow-lg flex items-center justify-center pointer-events-none"
          >
            <Move className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* BOTTOM-LEFT: CLEAN ROUNDED MAP METRICS CAPSULE PILL BADGE */}
        <div className="absolute bottom-4 left-4 bg-sky-600/95 text-white p-2.5 px-4 rounded-full font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2.5 z-[20] shadow-xl shadow-black/40 animate-pulse">
          <Activity className="w-3.5 h-3.5 text-sky-200" />
          <span ref={distanceRef}>{t('miscWidgets.gpsTrackVisualizer.distanceLabel', { distance: '0.0' })}</span>
          <span className="text-white/30">|</span>
          <span ref={altitudeRef}>{t('miscWidgets.gpsTrackVisualizer.altitudeLabel', { altitude: Math.round(parsed.stats.lowestPointM) })}</span>
        </div>

        {/* EXIT BUTTON */}
        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            onClose();
          }}
          className="absolute top-4 right-4 p-2.5 px-4 bg-slate-950/90 hover:bg-slate-900 text-white rounded-xl text-xs font-black border border-white/15 cursor-pointer flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition z-[40]"
        >
          <X className="w-4 h-4 text-rose-500" />
          <span>{t('miscWidgets.gpsTrackVisualizer.exitButton')}</span>
        </button>

        {/* COMPLETION SUMMARY CARD - shown once playback reaches the end of the route */}
        {isFinished && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-lg font-black text-white mb-1">{t('miscWidgets.gpsTrackVisualizer.finishedTitle')}</h3>
              <p className="text-xs text-slate-400 mb-5">{t('miscWidgets.gpsTrackVisualizer.finishedDescription')}</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{t('miscWidgets.gpsTrackVisualizer.statDistance')}</div>
                  <div className="text-sm font-black text-sky-400">{totalDistanceKm.toFixed(1)} km</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{t('miscWidgets.gpsTrackVisualizer.statElevationGain')}</div>
                  <div className="text-sm font-black text-emerald-400">+{parsed.stats.elevationGainM} m</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{t('miscWidgets.gpsTrackVisualizer.statHighestPoint')}</div>
                  <div className="text-sm font-black text-amber-400">{parsed.stats.highestPointM} m</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{t('miscWidgets.gpsTrackVisualizer.statDuration')}</div>
                  <div className="text-sm font-black text-rose-400">{getRouteDurationHours(parsed)} h</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer active:scale-[0.98] transition"
                >
                  {t('miscWidgets.gpsTrackVisualizer.restartButton')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase rounded-xl cursor-pointer active:scale-[0.98] transition"
                >
                  {t('miscWidgets.gpsTrackVisualizer.closeButton')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Simple controls bar under simulation viewer optimized for rapid touches */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex flex-col gap-3 select-none z-[100]">

        {/* Live elevation profile strip with a progress indicator synced to playback */}
        {elevationProfile.path && (
          <div className="relative w-full h-10 md:h-12">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
              <path d={elevationProfile.areaPath} fill="rgba(56,189,248,0.15)" stroke="none" />
              <path d={elevationProfile.path} fill="none" stroke="#38bdf8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <div
              ref={elevationIndicatorRef}
              className="absolute top-0 bottom-0 w-px bg-rose-500 pointer-events-none"
              style={{ left: '0%', boxShadow: '0 0 6px rgba(244,63,94,0.8)' }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white/70" />
            </div>
          </div>
        )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        {/* Play pause controls with 44px minimum touch layout */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-3 rounded-full cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isPlaying ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            aria-label={isPlaying ? t('miscWidgets.gpsTrackVisualizer.pauseSimulation') : t('miscWidgets.gpsTrackVisualizer.startSimulation')}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('miscWidgets.gpsTrackVisualizer.resetTitle')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleScreenshot}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('miscWidgets.gpsTrackVisualizer.screenshotTitle')}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Map surface mode: segmented control shows BOTH options so the active one is obvious
              at a glance, instead of a single button whose label was the opposite of the current mode */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/80 rounded-xl p-1 min-h-[44px]">
            <Layers className="w-4 h-4 text-sky-400 ml-1.5 mr-0.5 shrink-0" />
            <button
              type="button"
              onClick={() => setMapMode('2d')}
              className={`px-3 py-2 rounded-lg text-[11px] font-black cursor-pointer transition ${
                mapMode === '2d' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={t('miscWidgets.gpsTrackVisualizer.mode2dTitle')}
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => setMapMode('3d')}
              className={`px-3 py-2 rounded-lg text-[11px] font-black cursor-pointer transition ${
                mapMode === '3d' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={t('miscWidgets.gpsTrackVisualizer.mode3dTitle')}
            >
              3D
            </button>
          </div>

          {/* Camera Follow mode toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isFollowing;
              setIsFollowing(next);
              isFollowingRef.current = next;
              if (next) {
                // Re-arm auto-bearing and instantly align camera onto current hiker position
                userRotatedRef.current = false;
                updateMapAndMarkerVisuals(progressRef.current);
              }
            }}
            className={`px-3.5 py-2.5 border rounded-xl text-[11px] font-black transition flex items-center gap-2 min-h-[44px] cursor-pointer active:scale-95 ${
              isFollowing 
                ? 'bg-sky-600/25 text-sky-400 border-sky-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={isFollowing ? t('miscWidgets.gpsTrackVisualizer.releaseCameraTitle') : t('miscWidgets.gpsTrackVisualizer.lockCameraTitle')}
          >
            <Compass className={`w-4 h-4 ${isFollowing ? 'text-sky-400 animate-spin-slow' : 'text-slate-400'}`} style={isFollowing ? { animationDuration: '6s' } : undefined} />
            <span>{isFollowing ? t('miscWidgets.gpsTrackVisualizer.cameraFollowing') : t('miscWidgets.gpsTrackVisualizer.cameraFree')}</span>
          </button>
        </div>

        {/* Seamless drag progress scrub slider */}
        <div className="flex-1 w-full max-w-lg flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">{t('miscWidgets.gpsTrackVisualizer.trackingPanel')}</span>
          <div className="flex-1 relative flex items-center py-1">
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="1"
              step="0.001"
              defaultValue="0"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                progressRef.current = val;
                setIsPlaying(false); // Stop when scrubbing manually
                setIsFinished(false);
                updateMapAndMarkerVisuals(val);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
          <span ref={percentageTextRef} className="text-xs font-black font-mono text-sky-400 min-w-[34px] text-right">
            0%
          </span>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[9px] text-slate-500 font-extrabold uppercase">{t('miscWidgets.gpsTrackVisualizer.speed')}</span>
          {[1.0, 2.0, 3.5].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setPlaybackSpeed(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black ${
                playbackSpeed === s ? 'bg-sky-500/10 text-sky-400 border border-sky-400/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              } transition cursor-pointer active:scale-90`}
            >
              {s}x
            </button>
          ))}
        </div>

      </div>
      </div>

    </div>
  );
};
