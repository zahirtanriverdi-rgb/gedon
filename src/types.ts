export type UserRole = 'customer' | 'vendor' | 'admin';

export interface Guide {
  name: string;
  bio: string;
  avatar?: string;
  specialty?: string;
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
  guides?: Guide[];      // Team members/guides
  subscriptionValidUntil?: string; // ISO date string. Vendor's subscription end date.
  createdAt: string;
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

export interface Tour {
  id: string;
  name: string;
  category: TourCategory;
  difficulty: TourDifficulty;
  description: string;
  region: string;
  durationDays: number;
  durationHours?: number;
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
  rating: number;
  reviewsCount: number;
  isApproved: boolean; // Derived from status === 'approved' (kept for backward compat)
  status: 'approved' | 'pending_approval' | 'rejected';
  pendingData?: Record<string, any>; // Proposed edit awaiting admin approval; live fields stay unchanged until merged
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

  // Active Lifestyle and Adventure Specifics
  isActiveLife?: boolean;
  activityType?: 'volleyball' | 'running' | 'skiing' | 'rafting' | 'cycling' | 'other' | string;
  activeDifficulty?: 'beginner' | 'medium' | 'professional' | string;
  ageLimit?: string;
  requiredEquipment?: string;
  equipmentIncluded?: boolean;
  equipmentRentalPrice?: number;
  meetingPoint?: string;
  safetyInstructions?: string;
  allowTeamRegistration?: boolean;
  scheduleFrequency?: string; // e.g. 'one-time', 'daily', 'every-sunday', 'every-weekend'
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

export interface PlatformConfig {
  commissionPercentage: number; // e.g., 10 or 15%
}
