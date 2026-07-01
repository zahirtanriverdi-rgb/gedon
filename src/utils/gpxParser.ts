/**
 * Utility for parsing GPX (GPS Exchange Format) and KML (Keyhole Markup Language) file uploads client-side.
 * It computes trail statistics: total distance, highest/lowest elevation, and total elevation gain/loss.
 */

export interface ParsedGpxRoute {
  fileName: string;
  points: [number, number, number][]; // Array of [lat, lon, ele]
  stats: {
    distanceKm: number;
    highestPointM: number;
    lowestPointM: number;
    elevationGainM: number;
    elevationLossM: number;
  };
}

/**
 * Calculates the Haversine distance in kilometers between two GPS points
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses GPX or KML raw XML text and converts it into a clean structured format.
 */
export function parseGpsFile(fileName: string, xmlText: string): ParsedGpxRoute {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const points: [number, number, number][] = [];

  const lowerName = fileName.toLowerCase();
  
  if (lowerName.endsWith('.kml') || xmlText.includes('<kml') || xmlText.includes('<Placemark')) {
    // Parse KML
    const coordNodes = xmlDoc.getElementsByTagName('coordinates');
    for (let i = 0; i < coordNodes.length; i++) {
      const coordStr = coordNodes[i].textContent || '';
      // Matches spaces, tabs, newlines
      const segments = coordStr.trim().split(/\s+/);
      for (const seg of segments) {
        if (!seg) continue;
        const parts = seg.split(',');
        if (parts.length >= 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const ele = parts[2] ? parseFloat(parts[2]) : 0;
          if (!isNaN(lat) && !isNaN(lon)) {
            points.push([lat, lon, isNaN(ele) ? 0 : ele]);
          }
        }
      }
    }
  } else {
    // Parse GPX (default)
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    if (trkpts.length > 0) {
      for (let i = 0; i < trkpts.length; i++) {
        const trkpt = trkpts[i];
        const lat = parseFloat(trkpt.getAttribute('lat') || '');
        const lon = parseFloat(trkpt.getAttribute('lon') || '');
        const eleNode = trkpt.getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent || '0') : 0;
        
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon, isNaN(ele) ? 0 : ele]);
        }
      }
    } else {
      // Fallback: search for <wpt> or <rtept>
      const trackPoints = xmlDoc.querySelectorAll('wpt, rtept');
      for (let i = 0; i < trackPoints.length; i++) {
        const pt = trackPoints[i];
        const lat = parseFloat(pt.getAttribute('lat') || '');
        const lon = parseFloat(pt.getAttribute('lon') || '');
        const eleNode = pt.getElementsByTagName('ele')[0];
        const ele = eleNode ? parseFloat(eleNode.textContent || '0') : 0;
        
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon, isNaN(ele) ? 0 : ele]);
        }
      }
    }
  }

  if (points.length === 0) {
    throw new Error('No coordinates could be found in the uploaded GPS file.');
  }

  // Calculate stats from the original high-resolution points list
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let highestPoint = points[0][2];
  let lowestPoint = points[0][2];

  for (let i = 0; i < points.length; i++) {
    const curPt = points[i];
    const ele = curPt[2];
    
    if (ele > highestPoint) highestPoint = ele;
    if (ele < lowestPoint) lowestPoint = ele;

    if (i > 0) {
      const prevPt = points[i - 1];
      totalDistance += calculateHaversineDistance(prevPt[0], prevPt[1], curPt[0], curPt[1]);
      
      const eleDiff = ele - prevPt[2];
      if (eleDiff > 0) {
        elevationGain += eleDiff;
      } else {
        elevationLoss += Math.abs(eleDiff);
      }
    }
  }

  // Downsample coordinates if they are extremely dense to keep localStorage and render blindingly fast!
  // Target: max 350 points retains the shape perfectly for 2D/3D polyline plotting.
  let finalPoints = points;
  const maxPoints = 350;
  if (points.length > maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    finalPoints = [];
    finalPoints.push(points[0]); // Always keep start point
    for (let i = step; i < points.length - 1; i += step) {
      finalPoints.push(points[i]);
    }
    finalPoints.push(points[points.length - 1]); // Always keep end point
  }

  return {
    fileName,
    points: finalPoints,
    stats: {
      distanceKm: parseFloat(totalDistance.toFixed(2)),
      highestPointM: Math.round(highestPoint),
      lowestPointM: Math.round(lowestPoint),
      elevationGainM: Math.round(elevationGain),
      elevationLossM: Math.round(elevationLoss),
    },
  };
}
