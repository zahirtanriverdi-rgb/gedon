import { Tour, TourSlot, User, Review } from '../types';

// Mock/Seed users in our database representing Vendor (Tour Operators), Admin, and Customers
export const seedUsers: User[] = [
  {
    id: 'user-vendor-1',
    name: 'GedəkGörək',
    email: 'info@gedekgorek.az',
    username: 'gedekgorek',
    password: 'password123',
    role: 'vendor',
    phone: '+994 50 123 45 67',
    companyName: 'GedəkGörək LLC',
    balance: 450.0,
    whatsapp_number: '+994706717804',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    about: 'GedəkGörək Azərbaycanda peşəkar dağçılıq, yürüş və düşərgə turları üzrə ixtisaslaşmış komandadır. Təbiətlə həmahəng, təhlükəsiz və yaddaqalan ekoturlar təşkil edirik.',
    guides: [
      { name: 'Rəşad Nəbiyev', bio: 'Peşəkar alpinist və 10 illik təcrübəyə malik yürüş bələdçisi.', specialty: 'Zirvə yürüşləri və naviqasiya' },
      { name: 'Aygün Həsənova', bio: 'İlk yardım üzrə sertifikatlı mütəxəssis, kampinq kordinatoru.', specialty: 'Düşərgə həyatı və ekologiya' }
    ],
    createdAt: '2026-01-10T11:00:00Z'
  },
  {
    id: 'user-vendor-2',
    name: 'NDA',
    email: 'info@nda.az',
    username: 'nda_admin',
    password: 'password123',
    role: 'vendor',
    phone: '+994 70 987 65 43',
    companyName: 'NDA EcoTours',
    balance: 890.0,
    whatsapp_number: '+994706717804',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    about: 'NDA EcoTours olaraq biz təbiəti qorumaqla yanaşı, ekstrim və idman turlarını bir araya gətiririk. Yolsuzluq (off-road) və gəzinti maşrutlarının ustasıyıq.',
    guides: [
      { name: 'Elnur Rüstəmov', bio: 'Off-road sürücüsü və bələdçi.', specialty: 'Yolsuzluq və dağ yolları' },
      { name: 'Səbinə Məmmədova', bio: 'Yoqa və meditasiya təlimçisi. Təbiətdə yoqa turları üzrə ixtisaslaşıb.', specialty: 'Meditasiya, Yoqa turları' }
    ],
    createdAt: '2026-02-15T09:30:00Z'
  },
  {
    id: 'user-vendor-3',
    name: 'Peak&Trails',
    email: 'info@peakandtrails.az',
    username: 'peak_trails',
    password: 'password123',
    role: 'vendor',
    phone: '+994 55 125 45 45',
    companyName: 'Peak&Trails LLC',
    balance: 1200.0,
    whatsapp_number: '+994706717804',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'user-admin',
    name: 'Elnur Cəfərov',
    email: 'admin@gedekgore.az',
    role: 'admin',
    phone: '+994 55 555 55 55',
    balance: 1450.0,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'user-customer-1',
    name: 'Zahir Tanrıverdi',
    email: 'zahir.tanriverdi@gmail.com',
    role: 'customer',
    phone: '+994 99 888 77 66',
    balance: 500.0,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T12:00:00Z'
  }
];

// Normalized Tours Template database
export const seedTours: Tour[] = [
  // 1️⃣ Peak Tours (Zirvə Turları)
  {
    id: 'tour-mestdergah',
    name: 'Məstdərgah zirvəsi və Qrız şəlaləsi',
    category: 'peak',
    difficulty: 'hard',
    description: 'Quba rayonunun Qrız kəndindən başlayan çətin, lakin gözəl zirvə yürüşü. Meşə massivi, dağ keçidləri və donmuş möhtəşəm Qrız şəlaləsinə ziyarəti özündə birləşdirir.',
    region: 'Quba (Qrız)',
    durationDays: 1,
    includes: ['Professional Dağ Bələdçisi', 'Nəqliyyat (4x4 off-road)', 'Ekoloji bilet (Güləzi postu keçidi)', 'Səhər yeməyi', 'Çay süfrəsi'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 15,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-heydar-ataturk',
    name: 'Heydər Əliyev və Atatürk zirvələri ekspedisiyası',
    category: 'peak',
    difficulty: 'extreme',
    description: 'Qızıl Qaya massivində yerləşən 3751m Heydər zirvəsi və 3756m Atatürk zirvələrinə iki günlük alpist yürüşü. Müvafiq fiziki hazırlıq və xüsusi dırmanma ləvazimatları tələb olunur.',
    region: 'Quba (Xınalıq)',
    durationDays: 2,
    includes: ['2 Nəfər Sertifikatlı Alpist Bələdçi', 'Xüsusi Təhlükəsizlik Ləvazimatları', 'Şahdağ Milli Park icazəsi', 'Çadır və yataq torbası', 'Bütün yeməklər', 'Off-road Transfer'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 22,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-sulut',
    name: 'Sulut zirvə yürüşü',
    category: 'peak',
    difficulty: 'medium',
    description: 'İsmayıllı meşələrinin qəlbində yerləşən Sulut zirvəsinə ecazkar bir günlük yürüş. Tarixi Fit dağı qalası qalıqlarını da uzaqdan seyr etmək imkanınız olacaq.',
    region: 'İsmayıllı (Sulut)',
    durationDays: 1,
    includes: ['Bələdçi xidməti', 'Komfortlu sərnişin transferi', 'Səhər yeməyi', 'Yolüstü çay süfrəsi'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    reviewsCount: 8,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-kepez',
    name: 'Möhtəşəm Kəpəz zirvə yürüşü',
    category: 'peak',
    difficulty: 'hard',
    description: 'Göygöl Milli Parkı yaxınlığında yerləşən uca Kəpəz dağının (3066m) zirvəsinə bir günlük yürüş. Göygöl və ətrafdakı 7 gölün panoramik mənzərəsini zirvədən izləyin.',
    region: 'Göygöl (Kəpəz)',
    durationDays: 1,
    includes: ['Professional Dağ Bələdçisi', 'Göygöl Milli Parkı Giriş İcazəsi', 'Rahat VIP Transfer', 'Milli mətbəx nahar yeməyi', 'Yol sığortası'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 41,
    isApproved: true, status: 'approved',
    gpxFileName: 'kepez_zirve_yurusu.gpx',
    gpxData: '{"fileName":"kepez_zirve_yurusu.gpx","points":[[40.4180,46.3220,1500],[40.4120,46.3200,1520],[40.4040,46.3160,1560],[40.3960,46.3150,1630],[40.3890,46.3190,1720],[40.3840,46.3280,1850],[40.3810,46.3350,1960],[40.3780,46.3420,2080],[40.3750,46.3500,2180],[40.3710,46.3540,2270],[40.3670,46.3560,2380],[40.3640,46.3590,2480],[40.3610,46.3620,2580],[40.3580,46.3650,2690],[40.3560,46.3680,2780],[40.3540,46.3710,2870],[40.3525,46.3740,2950],[40.3515,46.3760,3010],[40.3511,46.3780,3066]],"stats":{"distanceKm":15.4,"highestPointM":3066,"lowestPointM":1500,"elevationGainM":1566,"elevationLossM":0}}'
  },
  {
    id: 'tour-bazarduzu',
    name: 'Bazardüzü zirvəsi fəthi (Azərbaycanın ən uca nöqtəsi)',
    category: 'peak',
    difficulty: 'extreme',
    description: 'Azərbaycanın və Şərqi Qafqazın ən yüksək zirvəsi olan Bazardüzü (4466m) dağına 3 günlük klassik ekspedisiya. Bu ekspedisiya ciddi dözümlülük və akklimatizasiya mərhələsi tələb edir.',
    region: 'Qusar (Bazardüzü)',
    durationDays: 3,
    includes: ['Rusiya Federasiyası ilə sərhəd zonası icazəsi', 'Şahdağ Milli Park bileti', '2 Alpine Dağ Bələdçisi', 'Düşərgə avadanlıqları (Çadır, Karomat, Primus)', 'Xüsusi bələdçi dəstəyi', 'Dağ sığortası'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewsCount: 19,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-tufandag',
    name: 'Tufandağ zirvə fəthi',
    category: 'peak',
    difficulty: 'extreme',
    description: '4191 metr hündürlükdə yerləşən Tufandağ zirvəsinə iki günlük dırmaşma yürüşü. Möhtəşəm çaylar və güclü küləkləri ilə məşhur olan dağlıq zonada çadır kampı qurularaq dırmaşılır.',
    region: 'Qəbələ (Tufandağ)',
    durationDays: 2,
    includes: ['Milli Park qeydiyyatı', 'Professional Dağ Bələdçiləri', 'Düşərgə qidalanma təminatı (Konserv və quru yemək)', '4x4 transfer xidməti', 'İlk Tibbi Yardım dəsti'],
    vendorId: 'user-vendor-3',
    vendorName: 'Peak&Trails',
    image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewsCount: 11,
    isApproved: true, status: 'approved'
  },

  // 2️⃣ Camp Tours (Camp Turları)
  {
    id: 'tour-ev-camp',
    name: 'Ev Kampı və Meşə İçi Hiking',
    category: 'camp',
    difficulty: 'easy',
    description: 'Qubada yerləşən rahat dağ evimiz ətrafında meşədə yürüş və dağ havası. Kamp qurmaq istəyən lakin komfortu sevən yeni başlayanlar üçün ideal seçimdir.',
    region: 'Quba',
    durationDays: 2,
    includes: ['Konfrorlu Dağ Evi Gecələmə', 'Hiking dəstəyi', 'Manqal şamı və samovar çayı', 'Səhər yeməyi', 'Bakıdan transfer'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?w=800&auto=format&fit=crop&q=80',
    rating: 4.5,
    reviewsCount: 14,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-cenub-camp',
    name: 'Cənub Kampı: Ekzotik meşə və Göbələk yığımı',
    category: 'camp',
    difficulty: 'medium',
    description: 'Hirik meşələrin qoynunda ecazkar iki günlük çadır kampı. Yerli bələdçinin nəzarəti altında bioloji təmiz göbələk və yabanı giləmeyvələrin toplanması yürüşü.',
    region: 'Lənkəran/Astara',
    durationDays: 2,
    includes: ['Kamp avadanlığı kirayəsi (Çadır, tulum, döşəkçə)', 'Professional Botanik Bələdçi', 'Xanbulan meşə gəzintisi', 'Səhər və Şam yeməkləri', 'Yerli Cənub mətbəxi ləvazimatları'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 23,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-hamosam',
    name: 'Hamoşam Dağ Kampı',
    category: 'camp',
    difficulty: 'medium',
    description: 'Astaranın ən ucqar nöqtələrindən biri olan və dumanlar içində itən Hamoşam yaylasında fantastik mənzərələrdən zövq alacağınız çadır kampı.',
    region: 'Astara (Hamoşam)',
    durationDays: 2,
    includes: ['Çadır qurulması təlimatçısı', 'Bələdçi dəstəyi', 'Region mətbəxi yeməkləri', '4x4 transit maşınlar', 'Kamp ocağı ətrafında musiqi gecəsi'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewsCount: 9,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-qusar-lazy',
    name: 'Qusar Lazy Camp',
    category: 'camp',
    difficulty: 'easy',
    description: 'Samur çayı sahili meşəlikdə, dağ ətəyində qurulan tam komfortlu, yeni nəsil istirahət kampı. Kamp qurub asudə vaxtını səmərəli və relax keçirmək istəyənlər üçün.',
    region: 'Qusar',
    durationDays: 2,
    includes: ['Quraşdırılmış komfortlu çadırlar', 'Katrinq xidməti (3 dəfə qidalanma)', 'Açıq hava cinema seansı', 'Canlı akustik gitar ifası', 'Komfortlu transfer'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1496545672447-f699b503d270?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    reviewsCount: 31,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-qax-qocyataq-camp',
    name: 'Qax kampı, Qoçyataq şəlaləsi və İlisu hamamları',
    category: 'camp',
    difficulty: 'medium',
    description: 'İlisu tarixi kəndi ətrafında, kükürdlü termal hamamlara gəzinti və füsunkar Qoçyataq şəlaləsində gecələməklə tamamlanan iki günlük gənclik kampı.',
    region: 'Qax (İlisu)',
    durationDays: 2,
    includes: ['Termal su daxil olmaqla giriş biletləri', 'Kamp çadır təminatı', 'Kabab şənliyi naharı', 'Bələdçi müşayiəti', 'Transfer xidməti'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 16,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-deniz-camp',
    name: 'Caspian Shore: Xəzər dənizi çimərlik kampı',
    category: 'camp',
    difficulty: 'easy',
    description: 'Xəzər dənizinin sərin sularının sahilində, ləpədöyəndə möhtəşəm dəniz kampı. Gün batımı, şənlik, çimərlik voleybolu və dəniz kənarında tonqal.',
    region: 'Bakı (Mərdəkan / Bilgəh)',
    durationDays: 2,
    includes: ['Dənizkənarı xüsusi ərazi girişi', 'Çadır, tulum, döşəkcə', 'Açıq havada barbekü', 'Musiqi / DJ dəstəyi', 'Sərinləşdirici içkilər'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    rating: 4.4,
    reviewsCount: 28,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-naxcivan-ev',
    name: 'Qədim diyar Naxçıvan turu (Evdə gecələmə ilə)',
    category: 'camp',
    difficulty: 'easy',
    description: 'Naxçıvan Muxtar Respublikasının füsunkar məkanlarına (Əshabi-Kəhf, Batabat gölü, Haçadağ mənzərəsi, Naxçıvanqala) maraqlı 3 günlük mədəni və ekoloji tur.',
    region: 'Naxçıvan',
    durationDays: 3,
    includes: ['Yerli kənd evində səmimi gecələmə', 'Naxçıvan milli mətbəxi yeməkləri', 'Giriş biletləri', 'Aviabilet xaric bütün daxili transferlər', 'Professional yerli bələdçi'],
    vendorId: 'user-vendor-2',
    vendorName: 'NDA',
    image: 'https://images.unsplash.com/photo-1561542320-9a18cd340469?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 12,
    isApproved: true, status: 'approved'
  },

  // 3️⃣ Hiking Tours (Hiking Turları)
  {
    id: 'tour-dilman',
    name: 'Ağsu, Dilman şəlaləsi yaz yürüşü',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Şamaxı yaylasından enən Ağsu dərəsində yerləşən nəhəng Dilman şəlaləsinə bir günlük möhtəşəm yaz gəzintisi. Baharın canlanmasını təbiətin qoynunda izləyin.',
    region: 'Ağsu (Dilman)',
    durationDays: 1,
    includes: ['Ekskursiya rəhbəri', 'Nəqliyyat', 'Səhər yeməyi', 'Çay süfrəsi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80',
    rating: 4.5,
    reviewsCount: 7,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-sahdili',
    name: 'Abşeron Milli Parkı, Şahdili yürüşü',
    category: 'hiking',
    difficulty: 'easy',
    description: 'Azərbaycan xəritəsinin ən ucqar nöqtəsi olan, qu quşu və xallı suitilər vətəni olan ecazkar Şahdili burnuna 10 kilometrlik dənizkənarı asan yürüş.',
    region: 'Abşeron (Şahdili)',
    durationDays: 1,
    includes: ['Milli Parka giriş bileti', 'Eko-Bələdçi', 'Səyahət sığortası', 'Bakıdan mikroavtobus transferi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewsCount: 18,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-sim-dustaqxana',
    name: 'Astara, Sım meşəliyi və Dustaqxana şəlaləsi',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Fantastik cənub təbiətini seyr edin! Nəhəng mamırlı qayalar və qədim Dustaqxana şəlaləsinə hiking. Turun sonunda təbii cənub mətbəxi ləzzətləri təqdim edilir.',
    region: 'Astara (Sım kəndi)',
    durationDays: 1,
    includes: ['Bələdçi xidməti', 'Rahat Transfer', 'Səhər yeməyi', 'Ləvəngi daxil olan xüsusi cənub nahar yeməyi', 'Yerli ev çayı'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 36,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-yardimli',
    name: 'Yardımlı, Kanyon yürüşü və Təkdam Şəlaləsi',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Yardımlı rayonunda kanyonlar və keçidlərlə dolu olan macəra yürüşü. Meşəarası gizli cığırları keçib ucqar şəlalələri kəşf edəcəyik.',
    region: 'Yardımlı',
    durationDays: 1,
    includes: ['Dağ bələdçisi', 'Nəqliyyat', 'Səhər yeməyi', 'Cənub mətbəxi üslubunda limitsiz ləvəngi naharı'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    reviewsCount: 12,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-embil',
    name: 'Şabran, Gizli Əmbil gölü meşə hikingi',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Meşənin daxilində sükut qucağında yerləşən mistik Əmbil gölünə 8 km yürüş. Kölgəli dağ yolları və yaşıl yamaclar sükunət gətirəcək.',
    region: 'Şabran (Əmbil)',
    durationDays: 1,
    includes: ['Tur rəhbəri', 'Nəqliyyat transferi', 'Səhər yeməyi', 'Göl kənarında samovar çayı'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 22,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-mucu-lahic',
    name: 'Mücü–Lahıc çətin dağ yürüşü',
    category: 'hiking',
    difficulty: 'hard',
    description: 'İsmayıllının Mücü kəndindən qədim misgərlik mərkəzi Lahıc qəsəbəsinə aşırımla keçən çətin və adrenalin dolu dağ hiking yürüşü.',
    region: 'İsmayıllı/Lahıc',
    durationDays: 1,
    includes: ['Professional idman bələdçisi', 'Nəqliyyat xidməti', 'Təhlükəsizlik rasiya dəstəyi', 'Enerji qutusu (Snickers, quru meyvələr)'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewsCount: 14,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-kuzun-laza',
    name: 'Qusar, Kuzun–Laza klassik hiking kəşfi',
    category: 'hiking',
    difficulty: 'easy',
    description: 'Şahdağ regionunun ən məşhur kanyon hiking marşrutu. Kuzun kəndindən başlayıb 11 km dərə boyu donmuş və ya gur axan Laza şəlalələrinə doğru asan və zövqlü yürüş.',
    region: 'Qusar (Kuzun / Laza)',
    durationDays: 1,
    includes: ['Milli Park girişi', 'Təcrübəli bələdçi', 'Xüsusi yürüş dəyənəkləri kirayəsi', 'Bakıdan transfer vobster', 'Restoranda nahar yeməyi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 78,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-xanbulan',
    name: 'Hirkan Meşələri və Xanbulan gölü hiking',
    category: 'hiking',
    difficulty: 'easy',
    description: 'YUNESKO-nun Ümumdünya İrsi siyahısına salınmış dəmirağacları ilə zəngin qədim Hirkan Milli Parkında Xanbulan su anbarı ətrafında asan meşə gəzintisi.',
    region: 'Lənkəran (Xanbulan)',
    durationDays: 1,
    includes: ['Milli Park rəsmi biletləri', 'Eskursiya bələdçisi', 'Bakıdan çıxışlı komfort avtobus', 'Səhər yeməyi', 'Çay süfrəsi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 19,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-qaranohur',
    name: 'İsmayıllı, Mistik Qaranohur gölü yürüşü',
    category: 'hiking',
    difficulty: 'hard',
    description: 'Dəniz səviyyəsindən 1500 metr yüksəklikdə yerləşən sirli Qaranohur gölünə dik və çətin dırmaşma yürüşü. Palçıqlı və sürüşkən meşə yollarından keçən güclü adrenalin yürüşüdür.',
    region: 'İsmayıllı (Qaranohur)',
    durationDays: 1,
    includes: ['Təcrübəli Yerli Dağ Bələdçiləri', 'Dağ və meşə keçid bileti', 'Off-road 4x4 dəstəyi', 'Xüsusi qoruyucu ayaqqabı rezin yapışdırıcısı', 'Səhər yeməyi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 42,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-sim-kendi-yurusu',
    name: '🌿 Sım kəndi yürüşü (Astara)',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Yazda Astaranın Sım kəndi tamam fərqli gözəllik qazanır! 💚 Təmiz hava, gur sulu şəlalələr və möhtəşəm təbiət mənzərələri ilə dolu bir gün sizi gözləyir.\n\nTUR PLANI:\n🕡 06:30 – Toplanış (Gənclik, Badamlı çıxışı)\n🚌 07:00 – Bakıdan yola düşürük\n🏡 10:00 – Kəndə çatırıq, dağ maşınları ilə şəlalələrə gedirik\n🏞️ 10:30 – Dustaqxana və Şırhal şəlalələrinə yürüş\n🍽️ 14:00 – Kənd evinə geri dönürük, nahar və çay süfrəsi\n🚙 16:00 – Kənddən qayıdırıq\n🚐 17:00 – Bakı istiqamətində yola düşürük\n🏙️ 22:00 – Bakıya çatırıq\n\n✔️ Önəmli qeyd: Təbiətə gedirik, yağışı, küləyi, palçığı dərd etməyən, hər şeyə mız qoyub, turu başqalarının da burnundan gətirməyən, əsl yol adamı olan, xoşniyyət, əyləncəli adamsansa, gəl 🌞\n\n📲 Qeydiyyat və əlavə məlumat üçün: +994 70 671 78 04',
    region: 'Astara (Sım kəndi)',
    durationDays: 1,
    includes: [
      'Komfortlu nəqliyyat (Bakı - Astara - Bakı)',
      'Yolsuzluq maşını 🚙',
      'Dağ bələdçisi və yerli bələdçi',
      'Dustaqxana və Şırhal şəlalələrinə yürüş',
      'Kənd evində cənub mətbəxi ilə nahar',
      'Çay süfrəsi ☕'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 16,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-sim-siyov-bendasar',
    name: '🌿 Astara – Sım ➝ Siyov ➝ Bəndəsər HİKİNG',
    category: 'hiking',
    difficulty: 'hard',
    description: 'Bir gün, 3 kənd, 17.5 km yürüş! Astaranın yaşıl meşələri, sitrus bağları və kənd yolları bizi gözləyir 🍊💚\n\n🚀 Marşrut: Sım ➝ Siyov ➝ Bəndəsər\n📏 Məsafə: 17.5 km\n📍 Görüş: 04:45 – Gənclik, Atatürk Parkı\n⏰ Bakıdan çıxış: 05:00\n🏙️ Geri dönüş: 23:00\n⚠️ Maksimum 15 nəfər limiti var!\n\n✔️ Önəmli qeyd: Təbiətə gedirik, yağışı, küləyi, palçığı dərd etməyən, hər şeyə mız qoyub, turu başqalarının da burnundan gətirməyən, əsl yol adamı olan, xoşniyyət, əyləncəli adamsansa, gəl 🌞\n\n📲 Qeydiyyat və əlavə məlumat üçün: +994 70 671 78 04',
    region: 'Astara (Sım ➝ Siyov ➝ Bəndəsər)',
    durationDays: 1,
    includes: [
      'Komfortlu nəqliyyat',
      'Hirkan Milli Parkına giriş',
      'Kənd evində nahar',
      'Dağ bələdçisi'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewsCount: 12,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-si-salalesi',
    name: '🌿 Astaranın nəhəng Şi şəlaləsinə möhtəşəm yürüş',
    category: 'hiking',
    difficulty: 'hard',
    description: 'Talış dağlarının sehrli meşələri ilə irəliləyib, 60 metr hündürlüyü ilə məşhur Şi şəlaləsini ziyarət edirik. Yol boyu həm Diqo, həm də Ayvarud kəndlərinin təbiət mənzərəsindən zövq alacağıq.\n\nPROQRAM:\n06:00 – Toplanma\n06:30 – Yola düşmə\n11:00 – Astara, Pəlikəş kəndinə çatma\n11:30 – Dağ maşınları ilə Avyarud kəndinə qalxış\n12:30 – Şi şəlaləsinə yürüş\n15:00 – Şəlaləyə çatış və istirahət\n16:00 – Pəlikəş kəndinə dönüş, kənd evində çay süfrəsi\n19:00 – Bakı istiqamətinə yola düşmə\n23:00 – Bakıya çatma\n\n✔️ Önəmli qeyd: Təbiətə gedirik, yağışı, küləyi, palçığı dərd etməyən, hər şeyə mız qoyub, turu başqalarının da burnundan gətirməyən, əsl yol adamı olan, xoşniyyət, əyləncəli adamsansa, gəl 🌞\n\n📲 Qeydiyyat və əlavə məlumat üçün: +994 70 671 78 04',
    region: 'Astara (Şi şəlaləsi)',
    durationDays: 1,
    includes: [
      'Komfortlu nəqliyyat (Bakı–Astara–Bakı)',
      'Avyaruda qalxmaq üçün dağ maşınları',
      'Dağ bələdçiləri',
      'Yürüş zamanı isti çay',
      'Kənd evində samovar çayı və şirniyyatlarla çay süfrəsi'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewsCount: 19,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-xalit-yasil-nerimankend',
    name: 'Xalıt Şəlaləsi, Yaşıl Göl və Nərimankənd Mağaraları',
    category: 'hiking',
    difficulty: 'medium',
    description: 'Qobustan, Şamaxı və İsmayıllı rayonlarının əsrarəngiz təbiət marşrutu. Möhtəşəm Xalıt Şəlaləsi, sükunət dolu Yaşıl Göl və qədim sirli Nərimankənd Mağaralarını özündə birləşdirən kəşf yürüşü. Yerli kənd mənzərələri və kanyon gəzintisi ilə zəngindir.',
    region: 'Qobustan / Şamaxı',
    durationDays: 1,
    includes: [
      'Komfortlu nəqliyyat transferi (Bakı-Qobustan-Bakı)',
      'Professional Dağ Bələdçiləri',
      'Mağaralara giriş icazəsi və fənər təminatı',
      'Səhər yeməyi (dağ havasında kənd məhsulları)',
      'Yürüş daxilində isti çay süfrəsi',
      'Şəlalə kənarında asudə vaxt'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 15,
    isApproved: true, status: 'approved'
  },
  {
    id: 'tour-kapadokya-sehr',
    name: '🎈 Kapadokya Sehrli Payız Turu',
    category: 'international',
    difficulty: 'easy',
    description: 'Kapadokiyanın bənzərsiz vadilərini kəşf edin, səhər tezdən rəngarəng hava şarlarının göy üzünü bəzəməsini izləyin və mağara hoteldə unudulmaz gecələr keçirin! 🌅✨',
    region: 'Türkiyə, Kapadokya',
    durationDays: 4,
    includes: [
      'Aviabilet (Gediş-Dönüş)',
      'Otel yerləşməsi (3 gecə, Cave Hotel)',
      'Qidalanma: Səhər Yeməkləri',
      'Hava limanı transferləri (Mercedes Sprinter)',
      'Yerli professional bələdçi paketi',
      'Səyahət sığortası'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewsCount: 24,
    isApproved: true, status: 'approved',
    isInternational: true,
    destinationCountry: 'Türkiyə',
    destinationCity: 'Kapadokya',
    durationNights: 3,
    flightIncluded: true,
    flightDetails: 'Pegasus Hava Yolları, Bakı - Kayseri Gediş-Dönüş, 23 kq yük + 8 kq əl yükü daxildir.',
    transferDetails: 'Mercedes Sprinter VIP transferlərilə qarşılanma və hər gün bütün daxili gəzintilər.',
    hotelName: 'Stone Age Cave Suites Cappadocia',
    hotelStars: 5,
    roomTypes: [
      { name: 'Double', priceDiff: 0 },
      { name: 'Twin', priceDiff: 20 },
      { name: 'Single', priceDiff: 85 }
    ],
    mealType: 'Səhər yeməyi',
    priceCurrency: 'USD',
    notIncluded: [
      'Şar uçuşu bileti (istəyə bağlı)',
      'Muzey və tarixi yerlərə giriş biletləri',
      'Şam və nahar yeməkləri'
    ],
    itinerary: [
      {
        day: 1,
        title: 'Kapadokyaya Gəliş və Qırmızı Tur səyahəti',
        description: 'Bakı Heydər Əliyev Hava Limanından uçuş. Kayseriyə çatma, qarşılanma və otelə yerləşmə. Günortadan sonra Üçhisar qalası və Sevgi vadisi yürüşü.',
        image: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 2,
        title: 'Hava Şarı Uçuşu və Göreme Açıq Səma Muzeyi',
        description: 'Səhər çox tezdən istəyə uyğun hava şarı gəzintisi və ya şarların uçuş mənzərəsinə baxış. Sonra Göreme Açıq Səma Muzeyi kəşfi.',
        image: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 3,
        title: 'Yeraltı Şəhər (Derinkuyu) və Ihlara Vadisi yürüşü',
        description: 'Dərinliyi 85 metrə çatan qədim Derinkuyu yeraltı şəhərinə enirik. Ardından yaşıl Ihlara vadisində çay bərabərində gözəl gəzintidən zövq alırıq.',
        image: 'https://images.unsplash.com/photo-1669046638904-38f8ef0eb9fa?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 4,
        title: 'Xəyallar Vadisi və Bakıya Geri Dönüş',
        description: 'Dəvə formalı süxurları ilə məşhur Devrent (Xəyallar) vadisini ziyarət, suvenir alış-verişi. Axşam Kayseri hava limanına transfer və Bakıya uçuş.',
        image: 'https://images.unsplash.com/photo-1699519408010-4a6a2a35a165?w=600&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 'tour-roma-toskana',
    name: '🇮🇹 Roma və Toskana Xəyalları',
    category: 'international',
    difficulty: 'easy',
    description: 'İtaliyanın mədəniyyət beşiyi olan Roma, Florensiya və unikal Toskana vadilərinə unudulmaz 5 günlük möhtəşəm payız səyahəti. Qədim Kolizey, Trevi fəvvarəsi və məşhur Toskana üzüm bağları gəzintisi ilə zəngindir. Qiymətə Bakı-Roma birbaşa gediş-dönüş biletləri və 4 ulduzlu butik otel daxildir!',
    region: 'İtaliya, Roma',
    durationDays: 5,
    includes: [
      'Bakı - Roma direkt aviabilet (Gediş-Dönüş)',
      '4 ulduzlu butik oteldə 4 gecə yerləşmə',
      'Qidalanma: İtalyan sayağı ləziz Səhər Yeməkləri',
      'Mercedes V-Class VIP şəxsi transferlər',
      'Roma və Florensiyada professional bələdçi ekskursiyaları',
      'Bütün tarixi muzey biletləri',
      'Şəxsi səyahət sığortası'
    ],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 18,
    isApproved: true, status: 'approved',
    isInternational: true,
    destinationCountry: 'İtaliya',
    destinationCity: 'Roma',
    durationNights: 4,
    flightIncluded: true,
    flightDetails: 'AZAL rəsmi aviaşirkəti, Bakı - Roma Gediş-Dönüş direkt uçuş. 23 kq baqaj + 10 kq əl yükü daxildir.',
    transferDetails: 'Mercedes V-Class VIP xidmətli qarşılanma və otelə transferlər.',
    hotelName: 'Hotel Quirinale Rome',
    hotelStars: 4,
    roomTypes: [
      { name: 'Double Suite', priceDiff: 0 },
      { name: 'Twin Comfort', priceDiff: 30 },
      { name: 'Single Premium', priceDiff: 110 }
    ],
    mealType: 'Səhər yeməyi',
    priceCurrency: 'EUR',
    notIncluded: [
      'Şəxsi digər muzey biletləri və gəzintilər',
      'Şam və Nahar yeməkləri',
      'Şəxsi cib və suvenir xərcləri'
    ],
    itinerary: [
      {
        day: 1,
        title: 'İtaliyanın Qəlbinə Xoş Gəldiniz! Romada qarşılanma',
        description: 'Bakıdan Romaya birbaşa uçuş. Hava limanında VIP qarşılanma və Hotel Quirinale-yə transfer, qeydiyyat və yerləşmə. Axşamüstü İspaniya pilləkənləri və məşhur Trevi fəvvarəsi ətrafında romantik ilk gəzinti.',
        image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 2,
        title: 'Antik Kolizey, Roman Forumu və Vatikan Kəşfi',
        description: 'Professional yerli bələdçi ilə Kolizey, qədim Roma Forumu və Vatikan Muzeylərinə növbəsiz daxil olaraq sənət və tarix incilərini kəşf edirik.',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 3,
        title: 'Renessansın Paytaxtı: Romantik Florensiya Səyahəti',
        description: 'Sürət qatarı ilə Florensiyaya səfər edirik. Piazzale Michelangelo-dan panoramik mənzərə kəşfi, əfsanəvi Santa Maria del Fiore kafedralı önündə xatirə şəkilləri.',
        image: 'https://images.unsplash.com/photo-1561164753-f0317799b8bf?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 4,
        title: 'Göz Oxşayan Toskana Vadiləri və Siyena Gəzintisi',
        description: 'Filmlərdən tanıdığımız Toskana vadiləri. Siyena şəhərində gəzinti. Doğma dağ kəndində yerli pendir növləri və xüsusi Toskana yeməklərinin dadımı.',
        image: 'https://images.unsplash.com/photo-1528114039593-4366cc08227d?w=600&auto=format&fit=crop&q=80'
      },
      {
        day: 5,
        title: 'Geri Dönüş və İtaliyayla Sağollaşma',
        description: 'Asudə vaxt, suvenir və italyan şokoladı alış-verişi. Günorta Roma Fiumicino hava limanına transfer və Bakıya birbaşa uçuşla evə xoş xatirələrlə dönüş.',
        image: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=600&auto=format&fit=crop&q=80'
      }
    ]
  },
  // 5️⃣ Active Lifestyle Tours (Aktiv Həyat Tərzi Turları)
  {
    id: 'tour-active-volleyball',
    name: 'Heydər Əliyev Pro Arenada Premium Voleybol Turniri 🏐',
    category: 'active',
    difficulty: 'medium',
    description: 'Peşəkar qapalı arenada təşkil olunan həvəskar voleybol turniri. İstər fərdi, istərsə də öz hazır komandanızla qeydiyyatdan keçərək qələbə uğrunda mübarizə apara bilərsiniz. Hakimlər, idman formaları və qaliblər üçün kubok və mükafatlar daxildir.',
    region: 'Bakı (Pro Arena)',
    durationDays: 1,
    includes: ['Peşəkar voleybol meydançası kirayəsi', 'Sertifikatlı dərəcəli hakim', 'Matç formaları və jiletlər', 'Su, izotonik enerji içkiləri', 'Medallar və Kubok', 'Professional foto qrup çəkilişi'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewsCount: 64,
    isApproved: true, status: 'approved',
    isActiveLife: true,
    activityType: 'volleyball',
    activeDifficulty: 'medium',
    ageLimit: '16-55 yaş arası',
    requiredEquipment: 'İdman ayaqqabısı və şort. (Dizlik arzuolunandır)',
    equipmentIncluded: true,
    equipmentRentalPrice: 10,
    meetingPoint: 'Bakı ş., Heydər Əliyev İdman Arenası, Əsas Giriş',
    safetyInstructions: 'Oyun zamanı fiziki zədələr (burxulmalar, zərbələr) ehtimalı var. İştirakçılar isinmə hərəkətlərinə mütləq riayət etməli və hakim qaydalarına tabe olmalıdırlar.',
    allowTeamRegistration: true
  },
  {
    id: 'tour-active-rafting',
    name: 'Kür Çayında coşqun Rafting və Kamp Macərası 🌊🚣‍♀️',
    category: 'active',
    difficulty: 'hard',
    description: 'Qəbələ və Şəmkir çay keçidləri, Kürün coşqun sularında adrenalin dolu rafting təcrübəsi. İlk dəfə iştirak edənlər üçün ətraflı təlimat keçirilir və hər qayığa peşəkar instruktor təhkim olunur.',
    region: 'Gəncə (Kür çayı)',
    durationDays: 1,
    includes: ['Peşəkar sızdırmaz sallar, avadanlıq (kaska, xilasat jileti, avar)', 'Sertifikatlı Rafting Instruktoru dəstəyi', 'Ətraflı təhlükəsizlik brifinqi', 'Su keçirməyən çanta', 'Kamp üslubunda çay və kabab naharı'],
    vendorId: 'user-vendor-1',
    vendorName: 'GedəkGörək',
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=800&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewsCount: 48,
    isApproved: true, status: 'approved',
    isActiveLife: true,
    activityType: 'rafting',
    activeDifficulty: 'professional',
    ageLimit: 'Minimum 18 yaş',
    requiredEquipment: 'Yedək paltar seti, rezin idman ayaqqabısı, dəsmal.',
    equipmentIncluded: false,
    equipmentRentalPrice: 15,
    meetingPoint: 'Bakı Gənclik TM qarşısı və ya Kür Qovşağı düşərgəsi',
    safetyInstructions: 'Rafting yüksək riskli idman növüdür. Üzmə bacarığı mütləqdir. Təlimatçının "Suya atıl" və ya "Avar çək" göstərişlərinə tabe olmaq şərtdir.',
    allowTeamRegistration: false
  }
];

// Normalized Slots with precise dates based on your input schedule
export const seedTourSlots: TourSlot[] = [
  // Məstdərgah zirvəsi: April 26
  { id: 'slot-mest-1', tourId: 'tour-mestdergah', startDate: '2026-04-26', endDate: '2026-04-26', price: 45.0, capacity: 18, bookedCount: 15 },
  
  // Heydər Əliyev & Atatürk zirvəsi: May 9–10
  { id: 'slot-heydar-1', tourId: 'tour-heydar-ataturk', startDate: '2026-05-09', endDate: '2026-05-10', price: 120.0, capacity: 12, bookedCount: 8 },
  
  // Sulut zirvə yürüşü: May 17
  { id: 'slot-sulut-1', tourId: 'tour-sulut', startDate: '2026-05-17', endDate: '2026-05-17', price: 30.0, capacity: 20, bookedCount: 12 },

  // Kəpəz zirvəsi: May 23, May 30, June 6, June 21
  { id: 'slot-kepez-1', tourId: 'tour-kepez', startDate: '2026-05-23', endDate: '2026-05-23', price: 55.0, capacity: 15, bookedCount: 14 },
  { id: 'slot-kepez-2', tourId: 'tour-kepez', startDate: '2026-05-30', endDate: '2026-05-30', price: 55.0, capacity: 15, bookedCount: 11 },
  { id: 'slot-kepez-3', tourId: 'tour-kepez', startDate: '2026-06-06', endDate: '2026-06-06', price: 55.0, capacity: 15, bookedCount: 5 },
  { id: 'slot-kepez-4', tourId: 'tour-kepez', startDate: '2026-06-21', endDate: '2026-06-21', price: 55.0, capacity: 15, bookedCount: 0 },

  // Bazardüzü zirvəsi: June 26–28, August 21–23
  { id: 'slot-bazar-1', tourId: 'tour-bazarduzu', startDate: '2026-06-26', endDate: '2026-06-28', price: 180.0, capacity: 10, bookedCount: 9 },
  { id: 'slot-bazar-2', tourId: 'tour-bazarduzu', startDate: '2026-08-21', endDate: '2026-08-23', price: 190.0, capacity: 10, bookedCount: 2 },

  // Tufandağ zirvəsi: July 18–19
  { id: 'slot-tufan-1', tourId: 'tour-tufandag', startDate: '2026-07-18', endDate: '2026-07-19', price: 140.0, capacity: 12, bookedCount: 6 },

  // Ev kampı: March 22–23
  { id: 'slot-evcamp-1', tourId: 'tour-ev-camp', startDate: '2026-03-22', endDate: '2026-03-23', price: 65.0, capacity: 15, bookedCount: 12 },

  // Cənub kampı: April 18–19
  { id: 'slot-cencamp-1', tourId: 'tour-cenub-camp', startDate: '2026-04-18', endDate: '2026-04-19', price: 75.0, capacity: 20, bookedCount: 18 },

  // Hamoşam kampı: April 25–26
  { id: 'slot-hamosham-1', tourId: 'tour-hamosam', startDate: '2026-04-25', endDate: '2026-04-26', price: 80.0, capacity: 15, bookedCount: 14 },

  // Qusar Lazy Camp: May 16–17, August 8–9
  { id: 'slot-lazy-1', tourId: 'tour-qusar-lazy', startDate: '2026-05-16', endDate: '2026-05-17', price: 90.0, capacity: 25, bookedCount: 22 },
  { id: 'slot-lazy-2', tourId: 'tour-qusar-lazy', startDate: '2026-08-08', endDate: '2026-08-09', price: 95.0, capacity: 25, bookedCount: 4 },

  // Qax kampı, Qoçyataq şəlaləsi: May 30–31, June 20–21, July 25–26
  { id: 'slot-qax-1', tourId: 'tour-qax-qocyataq-camp', startDate: '2026-05-30', endDate: '2026-05-31', price: 85.0, capacity: 16, bookedCount: 13 },
  { id: 'slot-qax-2', tourId: 'tour-qax-qocyataq-camp', startDate: '2026-06-20', endDate: '2026-06-21', price: 85.0, capacity: 16, bookedCount: 16 }, // FULLY BOOKED
  { id: 'slot-qax-3', tourId: 'tour-qax-qocyataq-camp', startDate: '2026-07-25', endDate: '2026-07-26', price: 85.0, capacity: 16, bookedCount: 2 },

  // Welcome Summer / Bakı Dəniz kampı: June 13–14, July 11–12, August 22–23
  { id: 'slot-sea-1', tourId: 'tour-deniz-camp', startDate: '2026-06-13', endDate: '2026-06-14', price: 40.0, capacity: 30, bookedCount: 27 },
  { id: 'slot-sea-2', tourId: 'tour-deniz-camp', startDate: '2026-07-11', endDate: '2026-07-12', price: 40.0, capacity: 30, bookedCount: 10 },
  { id: 'slot-sea-3', tourId: 'tour-deniz-camp', startDate: '2026-08-22', endDate: '2026-08-23', price: 45.0, capacity: 30, bookedCount: 0 },

  // Naxçıvan turu: June 13–15
  { id: 'slot-nax-1', tourId: 'tour-naxcivan-ev', startDate: '2026-06-13', endDate: '2026-06-15', price: 160.0, capacity: 14, bookedCount: 11 },

  // Ağsu Dilman: March 23
  { id: 'slot-dilman-1', tourId: 'tour-dilman', startDate: '2026-03-23', endDate: '2026-03-23', price: 25.0, capacity: 20, bookedCount: 19 },

  // Şahdili: March 28
  { id: 'slot-sahdili-1', tourId: 'tour-sahdili', startDate: '2026-03-28', endDate: '2026-03-28', price: 20.0, capacity: 40, bookedCount: 38 },

  // Sım & Dustaqxana: March 29, April 12, June 14
  { id: 'slot-sim-1', tourId: 'tour-sim-dustaqxana', startDate: '2026-03-29', endDate: '2026-03-29', price: 35.0, capacity: 25, bookedCount: 24 },
  { id: 'slot-sim-2', tourId: 'tour-sim-dustaqxana', startDate: '2026-04-12', endDate: '2026-04-12', price: 35.0, capacity: 25, bookedCount: 25 }, // FULLY BOOKED
  { id: 'slot-sim-3', tourId: 'tour-sim-dustaqxana', startDate: '2026-06-14', endDate: '2026-06-14', price: 35.0, capacity: 25, bookedCount: 8 },

  // Yardımlı: April 4
  { id: 'slot-yardimli-1', tourId: 'tour-yardimli', startDate: '2026-04-04', endDate: '2026-04-04', price: 38.0, capacity: 18, bookedCount: 17 },

  // Əmbil gölü: April 5, May 31
  { id: 'slot-embil-1', tourId: 'tour-embil', startDate: '2026-04-05', endDate: '2026-04-05', price: 28.0, capacity: 22, bookedCount: 20 },
  { id: 'slot-embil-2', tourId: 'tour-embil', startDate: '2026-05-31', endDate: '2026-05-31', price: 28.0, capacity: 22, bookedCount: 7 },

  // Mücü-Lahıc: April 11
  { id: 'slot-lahic-1', tourId: 'tour-mucu-lahic', startDate: '2026-04-11', endDate: '2026-04-11', price: 30.0, capacity: 16, bookedCount: 13 },

  // Kuzun-Laza: April 18, May 3, May 10, May 17, May 29, June 6, June 21, July 12, August 16
  { id: 'slot-kl-1', tourId: 'tour-kuzun-laza', startDate: '2026-04-18', endDate: '2026-04-18', price: 24.0, capacity: 30, bookedCount: 29 },
  { id: 'slot-kl-2', tourId: 'tour-kuzun-laza', startDate: '2026-05-03', endDate: '2026-05-03', price: 24.0, capacity: 30, bookedCount: 30 }, // FULLY BOOKED
  { id: 'slot-kl-3', tourId: 'tour-kuzun-laza', startDate: '2026-05-10', endDate: '2026-05-10', price: 24.0, capacity: 30, bookedCount: 21 },
  { id: 'slot-kl-4', tourId: 'tour-kuzun-laza', startDate: '2026-05-17', endDate: '2026-05-17', price: 24.0, capacity: 30, bookedCount: 18 },
  { id: 'slot-kl-5', tourId: 'tour-kuzun-laza', startDate: '2026-05-29', endDate: '2026-05-29', price: 24.0, capacity: 30, bookedCount: 25 },
  { id: 'slot-kl-6', tourId: 'tour-kuzun-laza', startDate: '2026-06-06', endDate: '2026-06-06', price: 24.0, capacity: 30, bookedCount: 12 },
  { id: 'slot-kl-7', tourId: 'tour-kuzun-laza', startDate: '2026-06-21', endDate: '2026-06-21', price: 24.0, capacity: 30, bookedCount: 3 },
  { id: 'slot-kl-8', tourId: 'tour-kuzun-laza', startDate: '2026-07-12', endDate: '2026-07-12', price: 24.0, capacity: 30, bookedCount: 1 },
  { id: 'slot-kl-9', tourId: 'tour-kuzun-laza', startDate: '2026-08-16', endDate: '2026-08-16', price: 24.0, capacity: 30, bookedCount: 0 },

  // Xanbulan: April 19, May 2
  { id: 'slot-xan-1', tourId: 'tour-xanbulan', startDate: '2026-04-19', endDate: '2026-04-19', price: 22.0, capacity: 25, bookedCount: 22 },
  { id: 'slot-xan-2', tourId: 'tour-xanbulan', startDate: '2026-05-02', endDate: '2026-05-02', price: 22.0, capacity: 25, bookedCount: 16 },

  // Qaranohur: April 19, May 29
  { id: 'slot-qara-1', tourId: 'tour-qaranohur', startDate: '2026-04-19', endDate: '2026-04-19', price: 32.0, capacity: 15, bookedCount: 15 }, // FULLY BOOKED
  { id: 'slot-qara-2', tourId: 'tour-qaranohur', startDate: '2026-05-29', endDate: '2026-05-29', price: 32.0, capacity: 15, bookedCount: 12 },

  // Sım kəndi yürüşü (Astara)
  { id: 'slot-simyur-1', tourId: 'tour-sim-kendi-yurusu', startDate: '2026-06-07', endDate: '2026-06-07', price: 55.0, capacity: 20, bookedCount: 4 },
  
  // Astara – Sım ➝ Siyov ➝ Bəndəsər HİKİNG
  { id: 'slot-simsiy-1', tourId: 'tour-sim-siyov-bendasar', startDate: '2026-06-29', endDate: '2026-06-29', price: 65.0, capacity: 15, bookedCount: 6 },
  
  // Astaranın nəhəng Şi şəlaləsinə yürüş
  { id: 'slot-sisal-1', tourId: 'tour-si-salalesi', startDate: '2026-07-05', endDate: '2026-07-05', price: 55.0, capacity: 18, bookedCount: 2 },

  // Xalıt Şəlaləsi, Yaşıl Göl və Nərimankənd Mağaraları
  { id: 'slot-xalit-1', tourId: 'tour-xalit-yasil-nerimankend', startDate: '2026-06-15', endDate: '2026-06-15', price: 35.0, capacity: 40, bookedCount: 15 },

  // Kapadokya Sehrli Payız Turu (Xarici Tur)
  { id: 'slot-kapadokya-1', tourId: 'tour-kapadokya-sehr', startDate: '2026-09-10', endDate: '2026-09-13', price: 590.0, capacity: 20, bookedCount: 4 },

  // Roma və Toskana Xəyalları (Xarici Tur)
  { id: 'slot-roma-1', tourId: 'tour-roma-toskana', startDate: '2026-10-15', endDate: '2026-10-20', price: 750.0, capacity: 15, bookedCount: 2 },

  // Active Lifestyle Slots
  { id: 'slot-active-vball-1', tourId: 'tour-active-volleyball', startDate: '2026-06-05', endDate: '2026-06-05', price: 25.0, capacity: 24, bookedCount: 16 },
  { id: 'slot-active-vball-2', tourId: 'tour-active-volleyball', startDate: '2026-06-12', endDate: '2026-06-12', price: 25.0, capacity: 24, bookedCount: 4 },
  { id: 'slot-active-rafting-1', tourId: 'tour-active-rafting', startDate: '2026-06-20', endDate: '2026-06-20', price: 60.0, capacity: 12, bookedCount: 3 }
];

// Pre-filled reviews with verified attendee status
export const seedReviews: Review[] = [
  {
    id: 'rev-1',
    tourId: 'tour-mestdergah',
    bookingId: 'book-past-1',
    customerId: 'user-customer-1',
    customerName: 'Zahir Tanrıverdi',
    rating: 5,
    comment: 'İnanılmaz gözəl mövsüm yürüşü idi. Keçidlər çətin olsa da, dağ bələdçiləri çox professionaldır, hər kəsə fərdi nəzarət etdilər. Ləvəngi dadlı idi!',
    createdAt: '2026-04-27T10:00:00Z',
    verifiedAttendee: true
  },
  {
    id: 'rev-2',
    tourId: 'tour-kuzun-laza',
    bookingId: 'book-past-2',
    customerId: 'user-customer-1',
    customerName: 'Aytən Məmmədova',
    rating: 5,
    comment: 'Laza şəlalələri heyranedicidir. Yeni başlayanlar üçün ən ideal marşrutdur, heç yorulmadıq. Təşkilatçılıq əla idi.',
    createdAt: '2025-05-04T12:30:00Z',
    verifiedAttendee: true
  },
  {
    id: 'rev-3',
    tourId: 'tour-qaranohur',
    bookingId: 'book-past-3',
    customerId: 'user-customer-x',
    customerName: 'Fərid Əliyev',
    rating: 4,
    comment: 'Yüksəliş olduqca dik və dumanlı idi. Yağış səbəbindən palçıqlı idi, amma gölün mənzərəsi çəkilən bütün əziyyətlərə dəyərdi.',
    createdAt: '2026-04-20T18:00:00Z',
    verifiedAttendee: true
  }
];
