'use client';
import React, { useMemo } from 'react';

interface RouteSparklineProps {
  points: [number, number, number][];
  className?: string;
}

const VIEW_SIZE = 100;
const PADDING = 10;

export const RouteSparkline: React.FC<RouteSparklineProps> = ({ points, className }) => {
  const { pathPoints, start, end } = useMemo(() => {
    if (!points || points.length === 0) {
      return { pathPoints: '', start: null as [number, number] | null, end: null as [number, number] | null };
    }

    const lats = points.map((p) => p[0]);
    const lons = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;
    const drawSize = VIEW_SIZE - PADDING * 2;

    const project = (lat: number, lon: number): [number, number] => {
      const x = PADDING + ((lon - minLon) / lonRange) * drawSize;
      // Flip Y: latitude increases upward, SVG y increases downward.
      const y = PADDING + (1 - (lat - minLat) / latRange) * drawSize;
      return [x, y];
    };

    const projected = points.map((p) => project(p[0], p[1]));

    return {
      pathPoints: projected.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      start: projected[0],
      end: projected[projected.length - 1],
    };
  }, [points]);

  if (!pathPoints || !start || !end) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <polyline
        points={pathPoints}
        fill="none"
        stroke="currentColor"
        className="text-slate-400"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={start[0]} cy={start[1]} r={3} className="fill-slate-500" />
      <circle cx={end[0]} cy={end[1]} r={4.5} className="fill-brand-primary" stroke="white" strokeWidth={1.5} />
    </svg>
  );
};