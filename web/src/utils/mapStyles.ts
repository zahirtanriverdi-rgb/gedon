import type maplibregl from 'maplibre-gl';

// Shared MapLibre satellite basemap used by both the GPX track visualizer and the camp sites
// page. High-availability Google tiles are used to bypass sandbox CORS/referer blocks.
export function createSatelliteStyle(): maplibregl.StyleSpecification {
  return {
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
}
