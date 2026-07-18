import type { NextConfig } from 'next';

/**
 * The browser keeps calling the API with RELATIVE URLs (`/api/tours`, …) exactly as it did
 * in the old Vite SPA. In the new split topology the Express API lives on a different origin,
 * so we rewrite every `/api/*` request through to it. This keeps all the ported client fetches
 * working unchanged — no per-call base-URL edits needed.
 *
 * Server Components fetch the API directly via API_BASE_URL (see src/lib/api.ts), so they do
 * not depend on this rewrite.
 */
const API_ORIGIN =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000';

const nextConfig: NextConfig = {
  // This app lives in a subfolder of the backend repo (which has its own lockfile); pin the
  // tracing root to this folder so Next doesn't guess the parent as the workspace root.
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      // Uploaded tour images / static assets are served by Express too.
      { source: '/tour-images/:path*', destination: `${API_ORIGIN}/tour-images/:path*` },
      { source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
  images: {
    // Tour images come from the API origin (and, in staging/prod, the CDN behind it).
    // Remote hosts are opt-in via env so staging can add its own without a code change.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS || '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean)
        .map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
  // maplibre-gl ships modern ESM that Next may need to transpile for the client bundle.
  transpilePackages: ['maplibre-gl'],
  eslint: { ignoreDuringBuilds: true },
  // Hide the floating "N" dev-tools indicator (bottom-left) during `next dev` — it was read
  // as part of the UI. Dev-only feature; production builds never show it either way.
  devIndicators: false,
};

export default nextConfig;
