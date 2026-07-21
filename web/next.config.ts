import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Express API server-inizin ünvanı (dev-də localhost:3000, prod-da Render və s.)
    const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    
    return [
      // 1. Bütün API sorğularını Express-ə yönləndir
      { 
        source: '/api/:path*', 
        destination: `${API_ORIGIN}/api/:path*` 
      },
      // 2. Tur şəkillərini Express-dən servis et
      { 
        source: '/tour-images/:path*', 
        destination: `${API_ORIGIN}/tour-images/:path*` 
      },
      // 3. Yüklənmiş media fayllarını Express-dən servis et
      { 
        source: '/uploads/:path*', 
        destination: `${API_ORIGIN}/uploads/:path*` 
      },
      // 4. ✅ YENİ ƏLAVƏ: Generasiya olunan PDF biletləri Express serverdən gətirmək üçün
      { 
        source: '/tickets/:path*', 
        destination: `${API_ORIGIN}/tickets/:path*` 
      },
    ];
  },
  
  // Xarici şəkillərə icazə vermək üçün (məsələn, tur şəkilləri və ya avatarlar)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;