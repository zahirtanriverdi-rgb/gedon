export type UserRole = 'customer' | 'vendor' | 'admin';

export interface Guide {
  id?: string; // Stable reference so tours can point at a specific guide even if their name/order changes later
  name: string;
  bio: string;
  avatar?: string;
  specialty?: string;
  translations?: Partial<Record<'en' | 'ru', { bio?: string; specialty?: string }>>; // Hand-written bio/specialty translations; source-of-truth (name/bio/specialty) is always Azerbaijani.
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  companyName?: string; // For Vendors (Tour Operators)
  balance: number;       // In AZN
  whatsapp_number?: string; // Driver/Guide direct WhatsApp link
  about?: string;        // Short biography/about details
  aboutTranslations?: Partial<Record<'en' | 'ru', string>>; // Hand-written translations of `about`; source-of-truth is always Azerbaijani.
  guides?: Guide[];      // Team members/guides
  subscriptionValidUntil?: string; // ISO date string. Vendor's subscription end date.
  createdAt: string;
  isArchived?: boolean; // Soft-deleted by an admin — account can no longer log in, but its tours/slots/bookings are preserved for records
  isManuallyDeactivated?: boolean; // Admin can flip this on/off any time, independent of subscriptionValidUntil — hides the vendor's tours immediately without touching their subscription date
  emailVerified?: boolean; // Owner has confirmed control of `email` via a mailed code — required before it can be used for password-reset. Resets to false whenever email changes.
  calculatorEnabled?: boolean; // Admin-set per vendor — shows/hides the guide-payment/net-income calculator tab in the vendor panel
  busTrackingEnabled?: boolean; // Admin-set per vendor — shows/hides the "buses sent to tours" tab in the vendor panel
  calculatorConfig?: GuideCalculatorConfig; // Admin-tuned per vendor; falls back to DEFAULT_GUIDE_CALCULATOR_CONFIG when unset
}

// Guide day-rates are tiered by the tour's own `category` (always set, unlike the old
// altitude-based approach which needed a manual field vendors often left empty). Tours with
// category 'active' or 'international' fall back to the hiking tier.
export type OffroadVehicleType = 'niva' | 'uaz' | 'gaz66';

export interface GuideCalculatorConfig {
  hikingBaseGuideDailyRate: number; // AZN/day, main guide, hiking-tier tours
  hikingAssistantGuideDailyRate: number; // AZN/day, assistant guide, hiking-tier tours
  campBaseGuideDailyRate: number; // AZN/day, main guide, camp-tier tours
  campAssistantGuideDailyRate: number; // AZN/day, assistant guide, camp-tier tours
  peakBaseGuideDailyRate: number; // AZN/day, main guide, peak/zirvə-tier tours
  peakAssistantGuideDailyRate: number; // AZN/day, assistant guide, peak/zirvə-tier tours
  mainGuideSecondBonusMultiplier: number; // Main guide's second bonus = participant count x this multiplier
  assistantGuideSecondBonusMultiplier: number; // Assistant guide's second bonus = participant count x this multiplier
  nivaPrice: number; // AZN per Niva used
  uazPrice: number; // AZN per UAZ used
  gaz66Price: number; // AZN per Gaz-66 used
  // Food/tea/entrance-fee unit prices are NOT stored here — the user found a saved "default"
  // meaningless for these (unlike vehicle rental, they vary too much tour to tour), so they're
  // entered fresh in the calculator itself every time (CalculatorTab.tsx food section).
}

export const DEFAULT_GUIDE_CALCULATOR_CONFIG: GuideCalculatorConfig = {
  hikingBaseGuideDailyRate: 40,
  hikingAssistantGuideDailyRate: 30,
  campBaseGuideDailyRate: 40,
  campAssistantGuideDailyRate: 30,
  peakBaseGuideDailyRate: 60,
  peakAssistantGuideDailyRate: 50,
  mainGuideSecondBonusMultiplier: 1.5,
  assistantGuideSecondBonusMultiplier: 1.5,
  nivaPrice: 80,
  uazPrice: 100,
  gaz66Price: 150,
};

// A transport record (bus, offroad vehicle, or any other vehicle) sent to a tour. Visible to
// every vendor on the platform (shared list), but only the vendor who created a record may
// edit or delete it — enforced server-side, not just hidden in the UI.
export interface VendorBus {
  id: string;
  vendorId: string;
  vendorName?: string; // Snapshot of the adding vendor's name/company, shown since the list is shared
  tourId?: string;
  tourName: string; // Snapshot of the tour name at the time the record was made
  contactPhone: string; // Mandatory driver/contact phone number
  vehicleDescription?: string; // Optional extra detail (plate number, company, vehicle type, etc.)
  price: number; // In AZN
  travelDate: string; // ISO date string
  createdAt?: string;
}

// A driver a vendor is warning other vendors about. Shared list (same visibility model as
// VendorBus): every vendor reads every entry, but only the reporting vendor may edit/delete it.
export interface DriverBlacklistEntry {
  id: string;
  vendorId: string;
  vendorName?: string; // Snapshot of the reporting vendor's name/company
  driverName: string;
  phoneNumber: string;
  reason: string;
  createdAt?: string;
}

// A snapshot of one guide-payment/net-income calculation, saved so a vendor can look up what
// they worked out for a given tour departure later. Private to the vendor who saved it — unlike
// VendorBus/DriverBlacklistEntry this is financial data, not something other vendors should see.
export interface SavedGuideCalculation {
  id: string;
  vendorId: string;
  tourId?: string;
  tourName: string; // Snapshot of the tour name at the time it was saved
  slotId?: string;
  slotDate?: string; // Snapshot of the chosen slot's date, if one was picked
  participants: number;
  pricePerPerson: number;
  durationDays: number;
  tier: 'hiking' | 'camp' | 'peak';
  mainGuideTotal: number;
  assistantGuideTotal: number;
  guideTotal: number; // Net payment to guides (after any manual override)
  busPrice: number;
  // Itemized rather than lumped into offroadTotal/foodTotal — so a saved record (and its
  // PDF/Excel export) can show exactly what money went where, not just category subtotals.
  nivaTotal: number;
  uazTotal: number;
  gaz66Total: number;
  sandwichTotal: number;
  villageLunchTotal: number;
  villageTeaTotal: number;
  nationalParkTotal: number;
  otherCostsTotal: number;
  collected: number;
  netIncome: number;
  createdAt?: string;
}

export type TourCategory = 'peak' | 'camp' | 'hiking' | 'international' | 'active';
export type TourDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface RoomType {
  name: 'Double' | 'Twin' | 'Single' | string;
  priceDiff: number; // Price difference helper (can be positive or negative)
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  image?: string;
}

// Yerli (bir günlük) turların saat-saat "Günün proqramı" timeline addımı — beynəlxalq
// turların gün-gün ItineraryDay-indən fərqli olaraq vaxt intervalı ilə işləyir.
export interface DayProgramStep {
  time: string; // "06:30" və ya "07:00–10:00"
  title: string;
  note?: string; // məs: "4x4 dağ maşınları ilə"
}

export interface Tour {
  id: string;
  name: string;
  // URL-friendly identifier used in /tours/:slug routes — generated once from `name` at
  // creation time and never regenerated on edit, so shared/bookmarked links stay stable.
  slug?: string;
  category: TourCategory;
  difficulty: TourDifficulty;
  description: string;
  region: string;
  durationDays: number;
  durationHours?: number;
  departureDateTime?: string; // ISO datetime string — trip's departure date & time
  returnDateTime?: string; // ISO datetime string — trip's return-to-Baku date & time; durationHours is derived from (returnDateTime - departureDateTime) when both are set
  includes: string[];
  highlights?: string[];
  languages?: string[];
  importantInfo?: {
    bring?: string[];
    notAllowed?: string[];
  };
  vendorId: string;
  vendorName: string;
  image: string;
  images?: string[]; // Multiple photos/gallery
  videos?: string[]; // Multiple videos/gallery
  rating?: number; // Vendor-set manual rating override, used until real reviews accumulate (see getAverageRating)
  reviewsCount?: number;
  isApproved: boolean; // Derived from status === 'approved' (kept for backward compat)
  status: 'approved' | 'pending_approval' | 'rejected';
  pendingData?: Record<string, any>; // Proposed edit awaiting admin approval; live fields stay unchanged until merged
  rejectionReason?: string; // Admin's stated reason the last time this tour (or its pending edit) was rejected
  isActive?: boolean;
  whatsapp_number?: string; // Tour specific direct WhatsApp number
  lastChangeLog?: string; // Log of edited fields
  gpxData?: string; // JSON representation of ParsedGpxRoute
  gpxFileName?: string;
  externalSales?: number; // External sales ticket count (WhatsApp, Instagram, etc)
  price?: number; // Headline listing price shown on cards/detail page, independent of per-date slot pricing
  discountPrice?: number; // Optional discounted headline price; shown with strikethrough on the original when set and lower than price

  // International Outbound Tour Specifics
  isInternational?: boolean;
  destinationCountry?: string;
  destinationCity?: string;
  durationNights?: number;
  flightIncluded?: boolean;
  flightDetails?: string;
  transferDetails?: string;
  hotelName?: string;
  hotelStars?: number; // 1 to 5 stars
  roomTypes?: RoomType[];
  mealType?: string; // Səhər yeməyi, Hər şey daxil (AI), Yarım pansion (HB) və s.
  priceCurrency?: 'AZN' | 'USD' | 'EUR';
  notIncluded?: string[];
  itinerary?: ItineraryDay[];
  dayProgram?: DayProgramStep[]; // Yerli turların saat-saat günün proqramı (vendor formda qurulur)

  // Active Lifestyle and Adventure Specifics
  isActiveLife?: boolean;
  activityType?: 'volleyball' | 'running' | 'skiing' | 'rafting' | 'cycling' | 'other' | string;
  activeDifficulty?: 'beginner' | 'medium' | 'professional' | string;
  ageLimit?: string; // Bütün kateqoriyalar üçün ümumi yaş limiti (məs: "12+"); detal səhifəsinin stats sırasında görünür
  requiredEquipment?: string;
  equipmentIncluded?: boolean;
  equipmentRentalPrice?: number;
  meetingPoint?: string;
  meetingPointLat?: number;
  meetingPointLng?: number;
  meetingPointEmbedUrl?: string; // Google Maps embed <iframe> src for the selected fixed meeting point (domestic tours, see src/data/meetingPoints.ts)
  guideIds?: string[]; // Which of the vendor's registered Guides are assigned to this specific tour
  isManuallyFeatured?: boolean; // Vendor override for the "Ayın Ən Çox Satılanı" badge — takes priority over the automatic monthly-bookings calculation, one tour per vendor at a time
  manuallyFeaturedAt?: string; // ISO timestamp of when the manual override was set
  cancellationHours?: number; // Free-cancellation window in hours before departure; 0 = non-refundable. Defaults to 48 when unset (legacy tours).
  safetyInstructions?: string;
  allowTeamRegistration?: boolean;
  scheduleFrequency?: string; // e.g. 'one-time', 'daily', 'every-sunday', 'every-weekend'
  translations?: Partial<Record<'en' | 'ru', { name: string; description: string | null; includes?: string[]; notIncluded?: string[]; highlights?: string[] }>>; // Machine-translated (Gemini) content, keyed by target language; populated in the background by scheduleTourTranslation. Source-of-truth content is always Azerbaijani.
}

export interface TourSlot {
  id: string;
  tourId: string;
  startDate: string;
  endDate: string;
  price: number; // In AZN
  capacity: number;
  bookedCount: number;
}

export type BookingStatus = 'paid' | 'pending' | 'cancelled' | 'Redirected_to_WhatsApp';

export interface Booking {
  id: string;
  slotId: string;
  tourId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  participantsCount: number;
  totalAmount: number; // In AZN
  status: BookingStatus;
  paymentMethod?: string; // 'pashabank' | 'portmanat' | 'epul' | 'whatsapp'
  booking_reference?: string; // E.g., #TUR-4750
  smsNotificationSent: boolean;
  paymentStatus?: 'Ödənilib' | 'Ödənilməyib';
  attendanceStatus?: 'Gözləmədə' | 'Təsdiqlənib' | 'Ləğv edilib' | 'İştirakçı gəldi';
  operatorNote?: string;
  ticketUrl?: string;

  // Active Lifestyle and Adventure Booking Specifics
  isTeamBooking?: boolean;
  teamName?: string;
  teamMembers?: { name: string; phone: string }[];
  usingOwnEquipment?: boolean;
  rentalEquipmentCostCount?: number;
}

export interface Review {
  id: string;
  tourId: string;
  bookingId: string; // Linking to booking guarantees attendee verification
  customerId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedAttendee: boolean; // Must be true in our anti-fake rating system
}

export interface PriceCalculatorConfig {
  destinations: Record<string, number>; // destination name -> one-way distance in km, used for the bus cost estimate
  busRatePerKm: number; // AZN per km for the round trip bus estimate
  busCampSurcharge: number; // extra flat AZN added to the bus cost for multi-day camp tours
  guideDailyBase: number; // flat AZN base fee for a guide on a single-day tour
  guideCampBase: number; // flat AZN base fee for a guide on a camp tour
  guidePerParticipant: number; // additional AZN per participant, added to the guide base fee
  foodDailyKendPrice: number; // AZN/person for a "village house" lunch on a daily tour
  foodDailySendvicPrice: number; // AZN/person for a sandwich lunch on a daily tour
  campBreakfastPrice: number; // AZN/person for camp breakfast
  campLunchPrice: number; // AZN/person for camp lunch
  tentRentalPrice: number; // AZN/person for tent rental
  sleepingBagRentalPrice: number; // AZN/person for sleeping bag rental
  matRentalPrice: number; // AZN/person for sleeping mat rental
}

export interface PlatformConfig {
  priceCalculatorConfig: PriceCalculatorConfig;
}

export type CampSiteStatus = 'pending_approval' | 'approved' | 'rejected';

// Public shape returned by GET /api/camp-sites — submitter is credited as "Name S."
// and the contact phone never reaches the client.
export interface CampSite {
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  photos: string[]; // base64 data URLs
  submitterName: string;
  isVerified: boolean; // "checked by our team on site" badge, admin-set only
  isPaid: boolean; // paid camp spot vs free
  addedByAdmin: boolean;
  createdAt: string;
}

// Admin shape (GET /api/admin/camp-sites) — full submitter details for moderation.
export interface AdminCampSite extends CampSite {
  submitterSurname: string;
  submitterPhone: string;
  submitterPhoneNormalized: string;
  status: CampSiteStatus;
  rejectionReason?: string;
  pointsAwarded: number;
  approvedAt?: string;
}

// GET /api/camp-sites/points response — a contributor's points standing.
export interface CampContributorStats {
  points: number;
  approvedCount: number;
  pointsPerSite: number;
  threshold: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  rewardsAvailable: number;
  pointsToNextReward: number;
}

// One row of GET /api/admin/camp-contributors.
export interface CampContributor {
  phoneNormalized: string;
  submitterName: string;
  submitterSurname: string;
  approvedCount: number;
  points: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  rewardsAvailable: number;
}
