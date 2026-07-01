import React, { useEffect, useRef, useState } from 'react';
import { ParsedGpxRoute } from '../utils/gpxParser';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Compass, 
  Layers,
  Activity
} from 'lucide-react';
import maplibregl from 'maplibre-gl';

interface GpsTrackVisualizerProps {
  gpxDataString: string;
}

export const GpsTrackVisualizer: React.FC<GpsTrackVisualizerProps> = ({ gpxDataString }) => {
  const [parsed, setParsed] = useState<ParsedGpxRoute | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Parse track coordinates on change
  useEffect(() => {
    try {
      if (gpxDataString) {
        const decoded = JSON.parse(gpxDataString);
        if (decoded && decoded.points && decoded.points.length > 0) {
          setParsed(decoded);
        }
      }
    } catch (e) {
      console.error('Failed to parse GPS route JSON:', e);
    }
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
                İNTERAKTİV 3D EKSPEDİSİYA
              </span>
              <span className="p-0.5 px-1.5 bg-sky-500 text-white font-black text-[8px] rounded uppercase">
                Yeni Göstərici
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-800 leading-tight uppercase mt-1.5">
              YÜRÜŞ TRAEKTORİYASINA PEYK XƏRİTƏSİNDƏ BAXIN 🏔️
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal max-w-md mt-1 font-medium">
              Dağ relyefini, keçid yüksəkliklərini və marşrut trayektoriyasını fırlana bilən 3D peyk kamerası ilə yaxından kəşf edin.
            </p>
          </div>
        </div>

        {/* Launch Button overlay */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto px-5 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10 shrink-0"
        >
          <span>Peyk xəritəsini aç 🚀</span>
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
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2.0);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);

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

    const pointsCount = parsed.points.length;
    const idx = Math.min(
      pointsCount - 1,
      Math.max(0, Math.floor(progress * (pointsCount - 1)))
    );
    const activePt = parsed.points[idx];
    const targetLngLat: [number, number] = [activePt[1], activePt[0]];

    // Move marker to current step coordinates
    marker.setLngLat(targetLngLat);

    // Camera tracker helper - Only track coordinates smoothly, zero spin-nausea, maximum tile sharpness
    if (!isUserInteractingRef.current && !isTransitioningRef.current && isFollowingRef.current) {
      map.jumpTo({
        center: targetLngLat
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
      const accumDistance = (parsed.stats.distanceKm * progress).toFixed(1);
      distanceRef.current.textContent = `Gedişat: ${accumDistance} km`;
    }
    if (altitudeRef.current) {
      const currentAltitude = Math.round(activePt ? activePt[2] : parsed.stats.lowestPointM);
      altitudeRef.current.textContent = `Yüksəklik: ${currentAltitude} metr`;
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
      bearing: 25
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

    map.on('dragstart', startInteraction);
    map.on('zoomstart', startInteraction);
    map.on('rotatestart', startInteraction);
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

      // Enable terrain if in '3d' mode initially (Use optimal non-jagged exaggeration)
      if (mapMode === '3d') {
        map.setTerrain({
          source: 'terrain-dem',
          exaggeration: 1.15
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
          'line-color': '#f59e0b', // Vibrant gold amber 
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
    if (!map) return;

    const progress = progressRef.current;
    const pointsCount = parsed.points.length;
    const idx = Math.min(
      pointsCount - 1,
      Math.max(0, Math.floor(progress * (pointsCount - 1)))
    );
    const activePt = parsed.points[idx];
    const targetLngLat: [number, number] = [activePt[1], activePt[0]];

    // Temporarily halt automatic tick jumps to let easeTo animation slide smoothly
    isTransitioningRef.current = true;

    if (mapMode === '3d') {
      try {
        if (map.getSource('terrain-dem')) {
          map.setTerrain({ source: 'terrain-dem', exaggeration: 1.15 });
        }
      } catch (err) {
        console.warn('Terrain activation failed:', err);
      }
      map.easeTo({
        center: targetLngLat,
        pitch: 55,
        bearing: 30, // Beautiful angle pointing towards the lakes and summits
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

      // Update simulation marker progression continuously 
      let nextProgress = progressRef.current + (delta * 0.010 * playbackSpeedRef.current);
      if (nextProgress >= 1.0) {
        nextProgress = 0.0; // loops continuously
      }
      progressRef.current = nextProgress;

      updateMapAndMarkerVisuals(nextProgress);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col text-slate-100 font-sans transition-all">
      
      {/* Main Maplibre Map Container */}
      <div className="flex-1 relative w-full h-full bg-[#f0f9ff] overflow-hidden select-none">
        
        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full text-slate-900" style={{ outline: 'none' }} />

        {/* BOTTOM-LEFT: CLEAN ROUNDED MAP METRICS CAPSULE PILL BADGE */}
        <div className="absolute bottom-4 left-4 bg-sky-600/95 text-white p-2.5 px-4 rounded-full font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2.5 z-[20] shadow-xl shadow-black/40 animate-pulse">
          <Activity className="w-3.5 h-3.5 text-sky-200" />
          <span ref={distanceRef}>Gedişat: 0.0 km</span>
          <span className="text-white/30">|</span>
          <span ref={altitudeRef}>Yüksəklik: {Math.round(parsed.stats.lowestPointM)} metr</span>
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
          <span>ÇIXIŞ</span>
        </button>

      </div>

      {/* Simple controls bar under simulation viewer optimized for rapid touches */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none z-[100]">
        
        {/* Play pause controls with 44px minimum touch layout */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-3 rounded-full cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isPlaying ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            aria-label={isPlaying ? "Simulyasiyanı dayandır" : "Simulyasiyaya başla"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={() => {
              progressRef.current = 0;
              setIsPlaying(true);
              updateMapAndMarkerVisuals(0);
            }}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Sıfırla"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Map surface toggle switch (Corrected "i/ı" lettering) */}
          <button
            type="button"
            onClick={() => setMapMode(mapMode === '3d' ? '2d' : '3d')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-[11px] font-black text-white cursor-pointer active:scale-95 transition flex items-center gap-2 min-h-[44px]"
            title={mapMode === '3d' ? "2D xəritə rejiminə keç" : "3D relyef rejiminə keç"}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>{mapMode === '3d' ? '2D REJİM' : '3D GÖRÜNÜŞ'}</span>
          </button>

          {/* Camera Follow mode toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isFollowing;
              setIsFollowing(next);
              isFollowingRef.current = next;
              if (next) {
                // Instantly align camera onto current hiker position
                updateMapAndMarkerVisuals(progressRef.current);
              }
            }}
            className={`px-3.5 py-2.5 border rounded-xl text-[11px] font-black transition flex items-center gap-2 min-h-[44px] cursor-pointer active:scale-95 ${
              isFollowing 
                ? 'bg-sky-600/25 text-sky-400 border-sky-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={isFollowing ? "Kameranı sərbəst burax (Xəritəni sərbəst fırladın)" : "Kameranı alpinistə kilidlə"}
          >
            <Compass className={`w-4 h-4 ${isFollowing ? 'text-sky-400 animate-spin-slow' : 'text-slate-400'}`} style={isFollowing ? { animationDuration: '6s' } : undefined} />
            <span>{isFollowing ? 'Kamera: İZLƏYİR' : 'Kamera: SƏRBƏST'}</span>
          </button>
        </div>

        {/* Seamless drag progress scrub slider */}
        <div className="flex-1 w-full max-w-lg flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">İZLƏMƏ PANELİ:</span>
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
          <span className="text-[9px] text-slate-500 font-extrabold uppercase">Sürət:</span>
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
  );
};
