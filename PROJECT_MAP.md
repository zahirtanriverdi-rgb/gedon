# Layihə Xəritəsi

Layihədəki hər qovluq və o qovluqdakı hər faylın nə iş gördüyünün tam siyahısı.

## Kök qovluq

| Fayl | İş |
|---|---|
| `server.ts` | Express serveri — bütün API endpoint-ləri (tours, bookings, auth, WhatsApp, PDF bilet), dev-də Vite-i middleware kimi işə salır |
| `vite.config.ts` | Vite build konfiqurasiyası |
| `vitest.config.ts` | Frontend unit test konfiqurasiyası (Vitest) |
| `vitest.config.api.ts` | Backend API test konfiqurasiyası |
| `playwright.config.ts` | E2E test konfiqurasiyası (Playwright) |
| `tsconfig.json` | TypeScript konfiqurasiyası |
| `eslint.config.js` | Lint qaydaları |
| `package.json` / `package-lock.json` | Asılılıqlar və skriptlər |
| `index.html` | SPA-nın HTML qabığı |
| `metadata.json` | Layihə metadata |
| `.env` / `.env.example` | Mühit dəyişənləri (API açarları və s.) |
| `database.sqlite` | SQLite məlumat bazası (dev) |
| `download-azerbaijan-dem.cjs` | Azərbaycan üçün relyef (DEM) tile-larını endirən birdəfəlik skript |
| `README.md` | Layihə haqqında ümumi qeydlər |

## `server/` — backend məntiqi

| Fayl | İş |
|---|---|
| `db.ts` | DB abstraksiyası — Local SQLite ilə Production PostgreSQL arasında keçidi asanlaşdırır, `initializeDatabase` |
| `translate.ts` | Gemini AI ilə tur/vendor mətnlərini AZ→EN/RU avtomatik tərcümə edir |
| `whatsapp.ts` | Baileys ilə server-side WhatsApp sessiyası (QR skan, nömrənin WhatsApp-da olub-olmadığını yoxlama) |
| `slugify.ts` | Tur adlarından unikal URL slug yaradır (`slugifyBase`) |
| `seedCredentials.ts` | Demo/seed hesabları üçün ilkin parollar |

## `scripts/` — birdəfəlik/köməkçi skriptlər

| Fayl | İş |
|---|---|
| `migrate-tours.ts` | Köhnə peak/camp/hiking turlarını (və səhv manual test turunu) yeni formata köçürür |
| `sync-hiking-tour-media.ts` | Real GPX marşrutları + real yer şəkillərini seed turlara əlavə edir |
| `sync-tour-translations.ts` | `tours.extra_data.translations`-ı əl ilə yazılmış EN/RU tərcümələrlə DB-də yeniləyir |

## `src/` — kök fayllar

| Fayl | İş |
|---|---|
| `App.tsx` | Router — hər portal (customer/vendor/admin) lazy-load olunur (jspdf və s. ağır asılılıqlara görə) |
| `main.tsx` | React tətbiqinin giriş nöqtəsi (root render) |
| `types.ts` | Bütün TypeScript tipləri (`UserRole`, Tour, Guide, Booking və s.) |
| `index.css` | Qlobal stil / Tailwind qatışdırması |
| `vite-env.d.ts` | Vite üçün TS mühit tipləri |

## `src/components/` — üst səviyyə komponentlər

| Fayl | İş |
|---|---|
| `AdminLogin.tsx` | Admin giriş formu |
| `AdminPortal.tsx` | Admin paneli — tur təsdiqi, vendor idarəetməsi, vendor redaktə təkliflərinə baxış |
| `CustomerPortal.tsx` | Müştəri paneli — bestseller reytinq artımı və əsas müştəri axını |
| `FAQPage.tsx` | Tez-tez verilən suallar səhifəsi |
| `GpsTrackVisualizer.tsx` | GPX marşrutunu xəritədə göstərən komponent |
| `LanguageSwitcher.tsx` | Dil seçici (AZ/EN/RU) |
| `NotFoundPage.tsx` | 404 səhifəsi |
| `OperatorLogin.tsx` | Vendor/operator giriş formu |
| `OrganizerProfile.tsx` | Operator/vendor ictimai profil səhifəsi |
| `PriceCalculator.tsx` | Qiymət/bələdçi kalkulyatoru |
| `SearchDropdown.tsx` | Axtarış zamanı açılan təkliflər siyahısı |
| `TourWeatherForecast.tsx` | Tur tarixləri üçün hava proqnozu widget-i |
| `VendorPortal.tsx` | Vendor paneli — abunəlik bitəndə göstərilən "abunə bitib" ekranı da daxil |

### `src/components/customer/`

| Fayl | İş |
|---|---|
| `CompareView.tsx` | Turların yan-yana müqayisə görünüşü |
| `ImageLightbox.tsx` | Tur şəkilləri üçün tam ekran lightbox |
| `OrganizerRoute.tsx` | Operator profilinə route (URL-dən operator tapıb göstərir) |
| `PackingListSection.tsx` | Təcrübə səviyyəsinə görə "AI" hazırladığı paket siyahısı bölməsi |
| `ReviewSubmissionPanel.tsx` | Rəy/reytinq göndərmə paneli |
| `TourDetailPage.tsx` | Tur detalları səhifəsinin əsas komponenti |
| `TourDetailRoute.tsx` | Tur detalı üçün route wrapper (lightbox state və s. ötürür) |
| `TourReviewsList.tsx` | Tur üçün rəylər siyahısı |
| `ToursHomeView.tsx` | Müştəri ana səhifəsi — tur grid/filtrlər |
| `WishlistView.tsx` | "İstəklərim" səhifəsi |

### `src/components/vendor/`

| Fayl | İş |
|---|---|
| `AddSlotForm.tsx` | Tur üçün yeni tarix/slot əlavə etmə formu |
| `CrmTab.tsx` | Vendor CRM — iştirakçı siyahısı və idarəetmə paneli |
| `DynamicStringListInput.tsx` | Klikləməklə əlavə/silinən sətir siyahısı (məs. "Qiymətə daxildir") |
| `EditTourModal.tsx` | TourForm/InternationalTourForm-u ehtiva edən redaktə modalı |
| `InternationalTourForm.tsx` | Xarici (outbound) turlar üçün vahid yaratma/redaktə formu |
| `LocationAutocompleteInput.tsx` | Google Places ilə "Görüş Yeri" ünvan avtomatik tamamlama |
| `MultiDateCalendar.tsx` | Turun işlədiyi konkret təqvim günlərini seçmə |
| `MyToursTab.tsx` | Vendorun öz turları siyahısı və idarəetməsi |
| `ProfileTab.tsx` | Vendor profil redaktəsi tabı |
| `QrScannerModal.tsx` | Bilet QR kodunu skan etmə modalı (səs+vibrasiya geri bildirişi ilə) |
| `TicketModal.tsx` | Bilet detalı/redaktə modalı |
| `TourDangerZone.tsx` | Yalnız redaktədə görünən status dəyişmə + ikiqat təsdiqli silmə bölməsi |
| `TourForm.tsx` | Yerli (domestic) tur yaratma/redaktə formu |
| `useTourFormWizard.ts` | Tur formu üçün addım-addım wizard state hook-u |

### `src/components/tours/`

| Fayl | İş |
|---|---|
| `CompareSwapModal.tsx` | Müqayisəyə 4-cü tur əlavə edilməyə çalışanda (3 dolu olanda) göstərilən dəyişdirmə modalı |
| `DifficultyInfoButton.tsx` | Çətinlik bar/label-ini izah edən "ⓘ" düyməsi |
| `RouteSparkline.tsx` | Marşrutun kiçik profil qrafiki (sparkline) |
| `ShareMenuButton.tsx` | Paylaşma menyusu (WhatsApp ikonu daxil olmaqla) |
| `TourRouteStatsCard.tsx` | Marşrut statistikası kartı (məsafə, hündürlük və s.) |
| `TourStatsRow.tsx` | Qiymət blokunun üstündəki sətir — GPX varsa marşrut statistikası göstərir |

### `src/components/layout/`

| Fayl | İş |
|---|---|
| `DashboardSidebarLayout.tsx` | Admin/vendor panelləri üçün ümumi sidebar layout |
| `StatCard.tsx` | Dashboard-larda istifadə olunan statistika kartı |

### `src/components/shared/`

| Fayl | İş |
|---|---|
| `WhatsAppVerifyField.tsx` | WhatsApp nömrəsini dial-kod + nömrəyə ayıran təsdiq input-u |

## `src/data/`

| Fayl | İş |
|---|---|
| `dialCodes.ts` | Ölkə telefon kodları (ITU) siyahısı |
| `meetingPoints.ts` | Yerli turlar üçün sabit görüş nöqtələri siyahısı |
| `tourTranslations.ts` | Əl ilə yazılmış EN/RU tur tərcümələri (docx-dən gələn peak/camp/hiking turlar üçün) |
| `toursData.ts` | Mock/seed istifadəçilər (Vendor, Admin, Customer) və əsas tur məlumatı mənbəyi |

## `src/i18n/`

| Fayl | İş |
|---|---|
| `LanguageContext.tsx` | Dil state-i (`Language = 'az' \| 'en' \| 'ru'`) context/provider |
| `tourLocalization.ts` | Tur məzmununu (AZ yazılıb, server tərcümə edir) seçilmiş dilə çevirən helper |

### `src/i18n/translations/`

| Fayl | İş |
|---|---|
| `adminPortal.ts` | Admin panel mətnləri (tur təsdiqi, vendor idarəetməsi, məzənnə) |
| `app.ts` | Tətbiq qabığı mətnləri (header/nav, qlobal axtarış, toast) |
| `common.ts` | Bir çox komponentdə paylaşılan ümumi mətnlər |
| `customerHome.ts` | Müştəri ana səhifə/gəzinti mətnləri (tur grid, wishlist, lightbox) |
| `customerMisc.ts` | Müştəri portal qabığı, axtarış, FAQ, operator profili mətnləri |
| `index.ts` | Bütün namespace modullarını birləşdirir (`{az, en, ru}`) |
| `miscWidgets.ts` | Ayrıca widget mətnləri (kalkulyator, GPS visualizer, hava, admin/operator login) |
| `tourDetailPage.ts` | Tur detalı/rezervasiya səhifəsi mətnləri |
| `vendorBookings.ts` | Vendor bookings/CRM mətnləri (CrmTab, TicketModal) |
| `vendorMisc.ts` | Vendor portal qabığı və digər vendor komponent mətnləri |
| `vendorTourForms.ts` | Vendor tur yaratma/redaktə form mətnləri |

## `src/utils/`

| Fayl | İş |
|---|---|
| `compare.ts` | Müştəri tur müqayisəsi (client-side, localStorage) |
| `featuredTours.ts` | Hansı turların "seçilmiş" (featured) olduğunu hesablayır |
| `googleMapsLoader.ts` | Google Maps SDK-nı lazy yükləyir, konfiqurasiya yoxlanışı |
| `gpxParser.ts` | GPX fayllarını parse edir (marşrut məsafə/hündürlük) |
| `hikingSubcategories.ts` | Ana səhifədə "hiking" kateqoriyası üçün client-side filtrlər |
| `recentSearches.ts` | Son axtarışlar tarixçəsi (header axtarış çubuğu) |
| `searchNormalize.ts` | Azərbaycan hərflərinə uyğun axtarış normallaşdırması |
| `weather.ts` | Open-Meteo API ilə Azərbaycan regionları üçün hava proqnozu |
| `wishlist.ts` | Müştəri "İstəklərim" siyahısı (client-side, login tələb olunmur) |

## `src/config/`

| Fayl | İş |
|---|---|
| `features.ts` | Feature flag-lar — `REVIEWS_ENABLED = false` (ödəniş sistemi hazır olana qədər saxta rəylərin qarşısını almaq üçün) |

## `src/hooks/`

| Fayl | İş |
|---|---|
| `useExpandingMenu.ts` | "İkon düymə + açılan kiçik panel" naxışının ortaq state maşını |

## `tests/`

| Fayl | İş |
|---|---|
| `setup.ts` | Vitest qlobal test qurulması |
| `api/auth.test.ts` | Auth API testləri |
| `api/bookings.test.ts` | Bookings API testləri |
| `api/tours.test.ts` | Tours API testləri |
| `api/globalSetup.ts` | API testləri üçün qlobal setup (DB, server başlatma) |
| `api/testUtils.ts` | API testləri üçün köməkçi funksiyalar (PORT və s.) |
| `e2e/admin-login.spec.ts` | Admin giriş axını E2E testi (Playwright) |
| `e2e/customer-marketplace.spec.ts` | Müştəri marketplace axını E2E testi |
| `e2e/vendor-login.spec.ts` | Vendor giriş axını E2E testi |

## Komponent yanında olan testlər

| Fayl | İş |
|---|---|
| `src/components/AdminLogin.test.tsx` | `AdminLogin.tsx` üçün unit test |
| `src/components/FAQPage.test.tsx` | `FAQPage.tsx` üçün unit test |
| `src/components/OperatorLogin.test.tsx` | `OperatorLogin.tsx` üçün unit test |
| `src/components/tours/TourStatsRow.test.tsx` | `TourStatsRow.tsx` üçün unit test |

## `public/`

| Qovluq | İş |
|---|---|
| `public/tour-images/` | Turların real yer şəkilləri (`tour-<slug>-1.jpg`, `-2.jpg` konvensiyası) |
| `public/tiles/terrain-dem/` | Relyef xəritə tile-ları (DEM) |

## Digər

| Qovluq | İş |
|---|---|
| `tickets/` | Generasiya olunmuş PDF biletlər (runtime çıxışı) |
| `data/whatsapp-auth/` | Baileys WhatsApp sessiya auth faylları |
| `fonts/` | PDF bilet generasiyası üçün şrift faylları |
