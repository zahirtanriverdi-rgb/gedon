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
    // Real elapsed time between the first and last recorded trackpoint timestamps
    // (i.e. total trip time including any stops), when the GPX file has <time> tags.
    // Undefined for KML or GPX files without timestamps.
    totalTimeHours?: number;
  };
}

/**
 * Calculates the Haversine distance in kilometers between two GPS points
 */
function calculateHaversineDistance(
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
  const trackTimestamps: number[] = [];

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

        const timeNode = trkpt.getElementsByTagName('time')[0];
        if (timeNode?.textContent) {
          const ts = Date.parse(timeNode.textContent);
          if (!isNaN(ts)) trackTimestamps.push(ts);
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

  // Total elapsed time (not just moving time) between the first and last timestamped
  // trackpoint — only meaningful if every point actually carried a <time> tag.
  let totalTimeHours: number | undefined;
  if (trackTimestamps.length === points.length && trackTimestamps.length > 1) {
    const elapsedMs = trackTimestamps[trackTimestamps.length - 1] - trackTimestamps[0];
    if (elapsedMs > 0) totalTimeHours = parseFloat((elapsedMs / 3_600_000).toFixed(2));
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
      ...(totalTimeHours !== undefined ? { totalTimeHours } : {}),
    },
  };
}

/**
 * Estimates on-trail hiking time from real route stats using Naismith's rule
 * (~5 km/h on flat terrain, plus 1 extra hour per 600m of cumulative ascent),
 * rounded to the nearest half hour (minimum 1h). This is what tour cards show for
 * duration on GPX-backed tours instead of a manually typed, trip-wide hour count.
 */
export function estimateHikingHours(stats: ParsedGpxRoute['stats']): number {
  const rawHours = stats.distanceKm / 5 + stats.elevationGainM / 600;
  return Math.max(1, Math.round(rawHours * 2) / 2);
}

/**
 * Returns the tour card's displayed duration for a GPX-backed route: the real total
 * elapsed time recorded in the GPX (start-to-finish, including any stops — not just
 * moving time) when the file has timestamps, otherwise falls back to the Naismith
 * estimate above.
 */
export function getRouteDurationHours(parsed: ParsedGpxRoute): number {
  if (parsed.stats.totalTimeHours !== undefined) {
    return Math.max(0.5, Math.round(parsed.stats.totalTimeHours * 2) / 2);
  }
  return estimateHikingHours(parsed.stats);
}

/**
 * Detects an out-and-back / circular route: the hiker ends up back near their starting
 * point, so the recorded `distanceKm` already covers the full there-and-back distance
 * rather than a one-way point-to-point trip (e.g. village A to village B). Compares the
 * straight-line gap between the first and last point against the total recorded distance
 * — a small gap relative to the total means the track loops back on itself.
 */
export function isRoundTripRoute(parsed: ParsedGpxRoute): boolean {
  const first = parsed.points[0];
  const last = parsed.points[parsed.points.length - 1];
  if (!first || !last || parsed.stats.distanceKm <= 0) return false;
  const gapKm = calculateHaversineDistance(first[0], first[1], last[0], last[1]);
  return gapKm / parsed.stats.distanceKm < 0.15;
}

/**
 * Safely decodes a Tour's stored `gpxData` JSON string back into a ParsedGpxRoute.
 * Returns null if the field is empty or the JSON is malformed/missing points.
 */
export function parseStoredGpxData(gpxDataString?: string): ParsedGpxRoute | null {
  if (!gpxDataString) return null;
  try {
    const decoded = JSON.parse(gpxDataString);
    if (decoded && Array.isArray(decoded.points) && decoded.points.length > 0) {
      return decoded as ParsedGpxRoute;
    }
    return null;
  } catch {
    return null;
  }
}
