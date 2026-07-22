# Layihə Xəritəsi

Layihədəki hər qovluq və o qovluqdakı hər faylın nə iş gördüyünün tam siyahısı.

Arxitektura: **kök = Express API** (port 3000), **`web/` = Next.js (App Router) frontend**
(port 3001, SSR/SEO). Köhnə Vite SPA (`src/`, `index.html`, `vite.config.ts`) tam silinib —
bütün UI artıq `web/`-dədir; brauzer `/api/*` sorğularını Next rewrite ilə Express-ə ötürür.

## Kök qovluq

| Fayl | İş |
|---|---|
| `server.ts` | Express serveri — bütün API endpoint-ləri (tours, bookings, auth, WhatsApp, PDF bilet) + `public/` statik faylları. Yalnız API — səhifələr Next.js-dədir |
| `vitest.config.api.ts` | Backend API test konfiqurasiyası |
| `tsconfig.json` | TypeScript konfiqurasiyası |
| `eslint.config.js` | Lint qaydaları (yalnız server/scripts — `web/` öz toolchain-i ilə) |
| `package.json` / `package-lock.json` | API asılılıqları və skriptlər (`dev`, `dev:web`, `build:web`, `test:api`) |
| `metadata.json` | Layihə metadata |
| `.env` / `.env.example` | Mühit dəyişənləri (API açarları və s.) |
| `database.sqlite` | SQLite məlumat bazası (dev) |
| `download-azerbaijan-dem.cjs` | Azərbaycan üçün relyef (DEM) tile-larını endirən birdəfəlik skript |

## `server/` — backend məntiqi

| Fayl | İş |
|---|---|
| `db.ts` | DB abstraksiyası — Local SQLite ilə Production PostgreSQL arasında keçidi asanlaşdırır, `initializeDatabase` |
| `email.ts` | E-poçt göndərmə (Resend/Nodemailer) |
| `storage.ts` | Media yükləmələri — S3-uyğun bucket və ya dev-də `public/uploads/` diski |
| `translate.ts` | Gemini AI ilə tur/vendor mətnlərini AZ→EN/RU avtomatik tərcümə edir |
| `whatsapp.ts` | Baileys ilə server-side WhatsApp sessiyası (QR skan, nömrənin WhatsApp-da olub-olmadığını yoxlama) |
| `telegram.ts` | Telegram bot inteqrasiyası — rezervasiya sorğularını vendor/admin chat-lərinə göndərir (inline "WhatsApp-dan cavabla" düymələri ilə), /start-a chat ID qaytaran long-polling köməkçisi. Token: `TELEGRAM_BOT_TOKEN` |
| `slugify.ts` | Tur adlarından unikal URL slug yaradır (`slugifyBase`) |
| `seedCredentials.ts` | Demo/seed hesabları üçün ilkin parollar |
| `campSites.ts` və s. | Kamp yerləri validasiyası/DB köməkçiləri |
| `geo.ts` | `/api/geo/resolve` — Google Maps linkini koordinata çevirir (tam linklər lokal parse, yalnız həqiqi Google short-link-lər host allowlist ilə fetch olunur — SSRF qorunması) |
| `overpass.ts` | Overpass/OpenStreetMap proxy-si (`/api/osm/pois`) — POI-ləri server-side cache + mirror fallback ilə çəkir |

## `shared/` — server və `web/` arasında ortaq modullar

| Fayl | İş |
|---|---|
| `types.ts` | Həm Express, həm Next tərəfindən idxal olunan ortaq TypeScript tipləri |
| `utils/googleMapsLink.ts` | Google Maps linkindən koordinat çıxaran saf funksiyalar (`server/geo.ts` bunu istifadə edir) |
| `data/toursData.ts`, `data/tourTranslations.ts` | Seed turlar və əl ilə yazılmış tərcümələr — hər iki tərəfin eyni mənbədən oxuması üçün |

## `scripts/` — birdəfəlik/köməkçi skriptlər

| Fayl | İş |
|---|---|
| `migrate-tours.ts` | Köhnə peak/camp/hiking turlarını yeni formata köçürür |
| `migrate-base64-media.ts` | DB-dəki köhnə base64 medianı storage-a köçürən dry-run-first skript |
| `sync-hiking-tour-media.ts` | Real GPX marşrutları + real yer şəkillərini seed turlara əlavə edir |
| `sync-tour-translations.ts` | `tours.extra_data.translations`-ı əl ilə yazılmış EN/RU tərcümələrlə DB-də yeniləyir |

## `web/` — Next.js frontend (App Router)

| Fayl | İş |
|---|---|
| `next.config.ts` | `/api/*`, `/tour-images/*`, `/uploads/*` sorğularını Express origin-inə rewrite edir; şəkil host-ları |
| `app/layout.tsx` | Kök layout — metadata, `Providers` (dil + valyuta + bildiriş) |
| `app/providers.tsx` | Client provider-lər (LanguageProvider, CurrencyProvider, NotificationProvider) |
| `app/globals.css` | Qlobal stil / Tailwind (dizayn tokenləri, animasiyalar) |
| `app/not-found.tsx` | 404 səhifəsi |
| `app/(site)/layout.tsx` | Müştəri səhifələri qabığı — SiteHeader + SEO SiteFooter (SSR tours) + MobileBottomNav |
| `app/(site)/page.tsx` | Ana səhifə (SSR) — tours/slots/reviews çəkib `HomeClient`-ə ötürür |
| `app/(site)/HomeClient.tsx` | Ana səhifənin tam interaktiv state qatı (axtarış, filtrlər, təqvim, quick-book) — köhnə CustomerPortal-ın portu |
| `app/(site)/tours/[slug]/` | Tur detalı (SSR + `TourDetailClient`) |
| `app/(site)/category/[category]/` | Kateqoriya başına səhifə (`/category/peak`, `camp`, `hiking`, `active`, `international`) — eyni HomeClient, bir kateqoriyaya kilidli, crawlable/share URL |
| `app/(site)/organizer/[id]/` | Operator ictimai profili |
| `app/(site)/faq`, `compare`, `wishlist`, `calculator`, `camp-sites` | Müvafiq müştəri səhifələri |
| `app/reset-password/` | Parol sıfırlama səhifəsi |
| `app/vendor/` | Vendor login + dashboard (öz `AuthProvider`-i, localStorage sessiya) |
| `app/admin/` | Admin login + dashboard (ayrıca `AuthProvider` — token bleed mümkün deyil) |

### `web/src/` — komponentlər və köməkçilər

Köhnə `src/`-in Next-ə uyğunlaşdırılmış tam nüsxəsi — qovluq strukturu eynidir:

| Qovluq | İş |
|---|---|
| `components/` | `AdminPortal`, `VendorPortal`, `FAQPage`, `PriceCalculator`, `SearchDropdown` və s. üst səviyyə komponentlər |
| `components/customer/` | `ToursHomeView`, `TourDetailPage`, `TourInquirySheet` (rezervasiya sorğu sheet/modalı), `CompareView`, `WishlistView`, `CampSitesPage`, `UrgentDealsBell` və s. |
| `components/vendor/` | `TourForm`, `InternationalTourForm`, `InquiryQuestionsEditor` (tur üzrə əlavə sorğu sualları), `CrmTab`, `MyToursTab`, `ProfileTab`, `QrScannerModal` və s. |
| `components/shared/InquiriesPanel.tsx` | Vendor/admin "Bildirişlər" tabının ortaq hissələri: sorğu siyahısı, "Hazır mesajlar" (WhatsApp şablonları) editoru, oxunmamış-badge hook-u |
| `components/admin/AdminInquiriesTab.tsx`, `AdminVendorTelegram.tsx` | Admin bildirişlər bölməsi (admin chat ID-ləri + şablonlar) və vendor başına Telegram chat ID bağlama |
| `components/tours/` | `TourStatsRow`, `RouteSparkline`, `ShareMenuButton`, `CompareSwapModal` və s. |
| `components/site/` | `SiteHeader`, `SiteFooter` (SEO daxili linkləmə), `MobileBottomNav` |
| `components/layout/`, `components/shared/`, `components/admin/` | Sidebar layout, StatCard, WhatsAppVerifyField, admin alətləri |
| `hooks/` | `useMarketplace` (dashboard data+CRUD), `useExpandingMenu` |
| `lib/` | `api.ts` (SSR/client fetch), `auth.tsx` (portal sessiyaları, localStorage), `currency.tsx` (valyuta + CBAR məzənnələri), `notification.tsx` |
| `i18n/` | `LanguageContext`, `tourLocalization`, `translations/` (AZ/EN/RU namespace-lər) |
| `utils/` | `compare`, `wishlist`, `gpxParser`, `weather`, `uploadMedia` (POST /api/upload), `searchNormalize` və s. |
| `data/` | `toursData` (seed istifadəçilər), `dialCodes`, `meetingPoints`, `tourTranslations` |
| `config/features.ts` | Feature flag-lar (`REVIEWS_ENABLED` və s.) |
| `types.ts` | Bütün TypeScript tipləri |

## `tests/`

| Fayl | İş |
|---|---|
| `api/auth.test.ts` | Auth API testləri |
| `api/bookings.test.ts` | Bookings API testləri |
| `api/campSites.test.ts` | Kamp yerləri API testləri |
| `api/tours.test.ts` | Tours API testləri |
| `api/globalSetup.ts` | API testləri üçün qlobal setup (DB, server başlatma) |
| `api/testUtils.ts` | API testləri üçün köməkçi funksiyalar (PORT və s.) |

Qeyd: köhnə SPA-ya bağlı unit testlər və Playwright E2E testləri SPA ilə birlikdə silinib —
UI testləri lazım olsa, Next tətbiqinə (port 3001) qarşı yenidən qurulmalıdır.

## `public/`

| Qovluq | İş |
|---|---|
| `public/tour-images/` | Turların real yer şəkilləri (`tour-<slug>-1.jpg`, `-2.jpg` konvensiyası) — Express servis edir |
| `public/uploads/` | Dev rejimində yüklənmiş media (S3 konfiqurasiya olunmayanda) |
| `public/tiles/terrain-dem/` | Relyef xəritə tile-ları (DEM) |

## Digər

| Qovluq | İş |
|---|---|
| `tickets/` | Generasiya olunmuş PDF biletlər (runtime çıxışı) |
| `data/whatsapp-auth/` | Baileys WhatsApp sessiya auth faylları |
| `fonts/` | PDF bilet generasiyası üçün şrift faylları |
