import React, { useState } from 'react';
import { 
  Cpu, 
  Database, 
  ShieldCheck, 
  CreditCard, 
  MessageSquare, 
  Search, 
  Layers, 
  Code, 
  CheckCircle, 
  ArrowRight, 
  Lock,
  Server,
  Network
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export default function ArchitectureView() {
  const [activeTab, setActiveTab] = useState<string>('architecture');

  const tabs: TabItem[] = [
    { id: 'architecture', label: 'System Architecture', icon: Network },
    { id: 'algorithms', label: 'Core Algorithms', icon: Cpu },
    { id: 'techstack', label: 'Tech Stack', icon: Layers },
    { id: 'db-schema', label: 'DB Schema (ERD)', icon: Database },
    { id: 'local-integrations', label: 'Local Integrations', icon: CreditCard }
  ];

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-6 py-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-medium tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full">
            Senior Architect Solution
          </span>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-white mt-2">
            Regional Tour Marketplace Blueprint
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise-grade technical architecture designed for high availability, transactional safety, and local market fit.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 bg-slate-950 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/50' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8">
        
        {/* TAB 1: SYSTEM ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="text-emerald-400 w-5 h-5" />
                  Sistem Arxitekturası (Platform Architecture Overview)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Platforma, daxili xırda microservislərə asanlıqla parçalana bilən hibrid <strong className="text-emerald-400">Modular Monolith / Decoupled Client-Server</strong> arxitekturasında layihələndirilmişdir. Bu arxitektura, ilkin mərhələdə idarəetmə və inteqrasiya asanlığı təmin edir, yüksək trafik anlarında isə spesifik xidmətlərin (məs. Axtarış və ya Rezervasiya) fərdi şəkildə miqyaslanmasına (autoscaling) imkan verir.
                </p>

                {/* Simulated SVG Diagram */}
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center">
                  <div className="text-xs font-mono text-slate-500 mb-4 self-start">VISUAL ARCHITECTURE FLOW DIAGRAM</div>
                  
                  {/* Layer 1: Client */}
                  <div className="flex justify-center gap-4 w-full">
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded text-center w-36 text-xs shadow-md">
                      <div className="font-semibold text-emerald-400">Next.js Web Client</div>
                      <div className="text-[10px] text-slate-400">SSR / Edge Mesh (SEO)</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded text-center w-36 text-xs shadow-md">
                      <div className="font-semibold text-sky-400">Mobile Apps</div>
                      <div className="text-[10px] text-slate-400">iOS & Android (SDK)</div>
                    </div>
                  </div>

                  <div className="h-6 w-0.5 bg-slate-700/60 my-1"></div>

                  {/* Layer 2: API Gateway */}
                  <div className="bg-slate-800 border border-emerald-500/30 px-6 py-2 rounded-lg text-center w-80 text-xs font-mono shadow-md">
                    <div className="font-bold text-slate-100 uppercase tracking-widest text-[10px]">API Gateway & Load Balancer</div>
                    <div className="text-[10px] text-slate-400">Nginx / Cloudflare Route Routing & SSL Termination</div>
                  </div>

                  <div className="h-6 w-0.5 bg-slate-700/60 my-1"></div>

                  {/* Layer 3: Services */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded text-center text-xs">
                      <div className="font-bold text-slate-200">Search Service</div>
                      <div className="text-[9px] font-mono text-amber-400">Elasticsearch</div>
                    </div>
                    <div className="bg-slate-900 border border-emerald-500/50 p-2.5 rounded text-center text-xs shadow-emerald-950 shadow-sm">
                      <div className="font-bold text-white">Booking Service</div>
                      <div className="text-[9px] font-mono text-emerald-400">FastAPI/Node Locked</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded text-center text-xs">
                      <div className="font-bold text-slate-200">Notification Hub</div>
                      <div className="text-[9px] font-mono text-purple-400">Celery + Redis</div>
                    </div>
                  </div>

                  <div className="h-6 w-0.5 bg-slate-700/60 my-1"></div>

                  {/* Layer 4: Cache & Queue */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 px-6 py-2 rounded text-center w-80 text-xs font-mono shadow-md">
                    <span className="font-bold text-emerald-400">Redis In-Memory Cluster</span>
                    <div className="text-[10px] text-slate-400">Distributed Locks, Sessions & Query Cache</div>
                  </div>

                  <div className="h-6 w-0.5 bg-slate-700/60 my-1"></div>

                  {/* Layer 5: Databases */}
                  <div className="flex justify-center gap-4 w-full">
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2.5 rounded text-center w-40 text-xs shadow-md">
                      <div className="font-bold text-slate-100 flex items-center justify-center gap-1">
                        <Database className="w-3.5 h-3.5 text-blue-400" />
                        PostgreSQL Master
                      </div>
                      <div className="text-[9px] text-slate-400">Write Heavy / ACIDs</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 px-4 py-2.5 rounded text-center w-40 text-xs shadow-md opacity-80">
                      <div className="font-bold text-slate-100 flex items-center justify-center gap-1">
                        <Database className="w-3.5 h-3.5 text-blue-400" />
                        Postgres Slave
                      </div>
                      <div className="text-[9px] text-slate-400">Read-Only Replication</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Specs Card */}
              <div className="space-y-6">
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 font-mono">
                    High-Traffic Scalability
                  </h4>
                  <ul className="space-y-4 text-xs">
                    <li className="flex gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">CDN & Edge Caching</strong>
                        Statik aktivlər, şəkillər və rəylər kənar Cloudflare CDN serverlərində keşlənir və yüklənmə vaxtı 100ms altına endirilir.
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Connection Pooling</strong>
                        PostgreSQL üçün PgBouncer istifadə edilərək eyni anda minlərlə paralel sorğu səmərəli idarə edilir.
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">Asynchronous Queues</strong>
                        Real-time ömürlük SMS-lər, Push-lar və bilet fenerlərinin gəlməsi əsas sorğu axınından ayrılıb arxa planda növbəyə ötürülür.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ALGORITHMS AND CORE LOGICS */}
        {activeTab === 'algorithms' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Dynamic Filter */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg w-fit text-emerald-400">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">1. Dinamik Axtarış Mühərriki</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Region, kateqoriya, çətinlik, qiymət intervalı və sərbəst mətn axtarışı.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-3 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-500">// Indexing Strategy (Postgres Trigram Index)</div>
                  <div>CREATE INDEX idx_tours_trgm ON tours </div>
                  <div>USING gin ((name || ' ' || description) </div>
                  <div>gin_trgm_ops);</div>
                  <div className="text-emerald-500 mt-2">// Geo-Spatial Search for Nearby Tours</div>
                  <div>ST_DWithin(geom, ST_MakePoint(lng, lat)::geography, radius_meters)</div>
                </div>
                <p className="text-xs text-slate-400">
                  *Yüksək trafik anında Elasticsearch mühərriki rəsmi axtarış bazası olmaq üçün sinxron data ötürmə ilə optimallaşdırılır.
                </p>
              </div>

              {/* Card 2: Concurrency & Booking */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg w-fit text-emerald-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">2. Concurrency (Overbooking) Qarşısının Alınması</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Eyni anda 1 boş yeri olan tura eyni saniyədə onlarla şəxsin müraciət etməsi zamanı sistemdə "Race Condition" və ifrat yer satılmasının qarşısını almaq üçün paylanmış kilid (distributed lock) sistemi tətbiq olunur.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-3 rounded border border-slate-800 space-y-1.5">
                  <div className="text-emerald-500">// Transactional Concurrency Control</div>
                  <div>BEGIN;</div>
                  <div className="text-amber-400">SELECT capacity, booked_count </div>
                  <div className="text-amber-400">FROM tour_slots WHERE id = $slot_id </div>
                  <div className="text-amber-400">FOR UPDATE;</div>
                  <div>-- if capacity &gt; booked:</div>
                  <div className="text-emerald-400">UPDATE tour_slots </div>
                  <div className="text-emerald-400">SET booked_count = booked_count + $qty</div>
                  <div className="text-emerald-400">WHERE id = $slot_id;</div>
                  <div>COMMIT;</div>
                </div>
                <p className="text-xs text-slate-400">
                  *Böyük kampaniya günlərində inanılmaz dərəcədə sürətli kilitləmə üçün Redis əsaslı `Redlock` alqoritmi istifadə olunur.
                </p>
              </div>

              {/* Card 3: Anti-Fake reviews */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg w-fit text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">3. Saxta Rəylərin Qarşısının Alınması</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Sosial mühitlərdə platformanın etibarlılığını saxlamaq üçün yalnız həmin turda iştirak etmiş və ödəniş etmiş (Paid statusu ilə) şəxslər rəy yaza bilər.
                </p>
                <div className="bg-slate-900 p-4 rounded border border-slate-800 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="p-1 bg-teal-500/10 text-teal-400 rounded-full text-[10px] font-mono inline-block">Qayda 1</span>
                    <span>Rəy cədvəlində <code>booking_id</code> xarici açarı (foreign key) unikal olmalıdır—eyni rezervasiyaya yalnız 1 rəy verilə bilər.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="p-1 bg-teal-500/10 text-teal-400 rounded-full text-[10px] font-mono inline-block">Qayda 2</span>
                    <span>Bazada yazma icazəsindən öncə: <code className="text-amber-400">SELECT 1 FROM bookings WHERE id = booking_id AND customer_id = user_id AND status = 'paid'</code> doğrulaması məcburidir.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: TECH STACK */}
        {activeTab === 'techstack' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Code className="text-emerald-400 w-5 h-5" />
              Tövsiyə Edilən Müasir Texnoloji Stek (Scale & Performance Stack)
            </h3>
            <p className="text-slate-300 text-sm">
              Bu texnoloji yığın, axtarış sistemlərinin sayta gəlməsi (SEO), platformanın sürətli fəaliyyəti (FCP & LCP) və məlumat bütövlüyü (ACID prinsipləri) üçün ən optimal variantdır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">Frontend</div>
                <h4 className="text-md font-bold text-white mb-3">Next.js 14+ (React)</h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>Server-Side Rendering (SSR) ilə SEO-ya yüksək uyğunluq.</li>
                  <li>Incremental Static Regeneration (ISR) ilə turların sürətli yüklənməsi.</li>
                  <li>Tailwind CSS ilə mükəmməl responsiv vizuallıqlar.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1">Backend</div>
                <h4 className="text-md font-bold text-white mb-3">Node.js Express / Python FastAPI</h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>FastAPI: Avtomatik generasiya edilən Swagger sənədləşməsi, inanılmaz asinxron performans.</li>
                  <li>TypeScript / Pydantic ilə tam tipli, etibarlı datalar.</li>
                  <li>Yüksək I/O performansı tələb edən tranzaksiya mərkəzi.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-1">Verilənlər Bazası</div>
                <h4 className="text-md font-bold text-white mb-3">PostgreSQL + MariaDB</h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>Tranzaksiyaların bütövlüyü üçün ACID xüsusiyyətləri.</li>
                  <li>JSONb dəstəyi ilə tur proqramlarının çevik strukturu.</li>
                  <li>Şəbəkədən kənar sürətli relyasiyalar (ForeignKey cascade).</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-1">Keş və Növbə</div>
                <h4 className="text-md font-bold text-white mb-3">Redis Cluster</h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>Dinamik sorğuların millisekundluq keşlənməsi.</li>
                  <li>Sessiyalar və rate-limiting vasitəsi ilə saytın təhlükəsizliyi.</li>
                  <li>Ödəniş və SMS növbələşməsi üçün broker rolunu icra edir.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: DATABASE SCHEMA */}
        {activeTab === 'db-schema' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="text-emerald-400 w-5 h-5" />
              Verilənlər Bazası Entity-Relationship Schema (SQL-focused View)
            </h3>
            <p className="text-slate-300 text-sm">
              Bu sxem müştərilər, turlar, bələdçilərin slotları, rezervasiya, rəylər və mərkəzi maliyyə datalarının necə əlaqələndiyini nümayiş etdirir. Tranzaksiya təhlükəsizliyi və performans üçün xarici açarlar (FK) və indekslər təyin olunmuşdur.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Table Definitions Visualizer */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">İlişkili Cədvəllər (Relational Tables)</h4>
                
                {/* Users Table */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">📁 Users (İstifadəçilər)</span>
                    <span className="text-[10px] font-mono text-blue-400">One-to-Many - Tours, Bookings</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-400">
                    <div>🔑 id (UUID, PK)</div>
                    <div>• role ('customer', 'vendor', 'admin')</div>
                    <div>• name (VARCHAR)</div>
                    <div>• email (VARCHAR, UNIQUE)</div>
                    <div>• phone (VARCHAR)</div>
                    <div>• balance (DECIMAL)</div>
                  </div>
                </div>

                {/* Tours Table */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">📁 Tours (Turlar Siyahısı)</span>
                    <span className="text-[10px] font-mono text-amber-500">Many-to-One - Users</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-400">
                    <div>🔑 id (UUID, PK)</div>
                    <div>🔗 vendor_id (UUID, FK ➔ Users)</div>
                    <div>• name (VARCHAR)</div>
                    <div>• category (enum)</div>
                    <div>• difficulty (enum)</div>
                    <div>• is_approved (BOOLEAN)</div>
                  </div>
                </div>

                {/* Tour_Slots Table */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">📁 Tour_Slots (Turun Təqvimi və Qiymətlər)</span>
                    <span className="text-[10px] font-mono text-red-400">Many-to-One - Tours</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-400">
                    <div>🔑 id (UUID, PK)</div>
                    <div>🔗 tour_id (UUID, FK ➔ Tours)</div>
                    <div>• start_date (DATE)</div>
                    <div>• price (DECIMAL)</div>
                    <div>• capacity / booked_count (INT)</div>
                  </div>
                </div>

                {/* Bookings Table */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">📁 Bookings (Rezervasiyalar və Statuslar)</span>
                    <span className="text-[10px] font-mono text-emerald-400">One-to-Many - Reviews</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-400">
                    <div>🔑 id (UUID, PK)</div>
                    <div>🔗 slot_id (UUID, FK ➔ Tour_Slots)</div>
                    <div>🔗 customer_id (UUID, FK ➔ Users)</div>
                    <div>• status ('paid', 'pending', 'cancelled')</div>
                    <div>• participants_count (INT)</div>
                    <div>• total_amount (DECIMAL)</div>
                  </div>
                </div>

                {/* Reviews Table */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">📁 Reviews (Verified Rəylər)</span>
                    <span className="text-[10px] font-mono text-purple-400">Many-to-One - Tours, Bookings</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-400">
                    <div>🔑 id (UUID, PK)</div>
                    <div>🔗 tour_id (UUID, FK ➔ Tours)</div>
                    <div>🔗 booking_id (UUID, FK ➔ Bookings, UNIQUE)</div>
                    <div>🔗 customer_id (UUID, FK ➔ Users)</div>
                    <div>• rating (INT 1-5)</div>
                    <div>• comment (TEXT)</div>
                  </div>
                </div>

              </div>

              {/* DDL SQL Generation Preview */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">PostgreSQL DDL Kod Sənədi</h4>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 h-[480px] overflow-y-auto space-y-3 scrollbar-none select-all">
                  <div>
                    <span className="text-emerald-500">-- 1. Create custom enum types</span><br />
                    <span className="text-pink-400">CREATE TYPE</span> user_role_enum <span className="text-pink-400">AS ENUM</span> ('customer', 'vendor', 'admin');<br />
                    <span className="text-pink-400">CREATE TYPE</span> tour_cat_enum <span className="text-pink-400">AS ENUM</span> ('peak', 'camp', 'hiking');<br />
                    <span className="text-pink-400">CREATE TYPE</span> difficulty_enum <span className="text-pink-400">AS ENUM</span> ('easy', 'medium', 'hard', 'extreme');<br />
                    <span className="text-pink-400">CREATE TYPE</span> booking_status_enum <span className="text-pink-400">AS ENUM</span> ('paid', 'pending', 'cancelled');
                  </div>

                  <div>
                    <span className="text-emerald-500">-- 2. Create Users Table</span><br />
                    <span className="text-pink-400">CREATE TABLE</span> users (<br />
                    &nbsp;&nbsp;id UUID <span className="text-pink-400">PRIMARY KEY DEFAULT</span> gen_random_uuid(),<br />
                    &nbsp;&nbsp;role user_role_enum <span className="text-pink-400">NOT NULL</span>,<br />
                    &nbsp;&nbsp;name <span className="text-blue-400">VARCHAR(100) NOT NULL</span>,<br />
                    &nbsp;&nbsp;email <span className="text-blue-400">VARCHAR(255) UNIQUE NOT NULL</span>,<br />
                    &nbsp;&nbsp;phone <span className="text-blue-400">VARCHAR(30)</span>,<br />
                    &nbsp;&nbsp;balance <span className="text-pink-400">DECIMAL(10,2) DEFAULT</span> 0.00,<br />
                    &nbsp;&nbsp;created_at <span className="text-pink-400">TIMESTAMP DEFAULT</span> CURRENT_TIMESTAMP<br />
                    );
                  </div>

                  <div>
                    <span className="text-emerald-500">-- 3. Create Tours Table</span><br />
                    <span className="text-pink-400">CREATE TABLE</span> tours (<br />
                    &nbsp;&nbsp;id UUID <span className="text-pink-400">PRIMARY KEY DEFAULT</span> gen_random_uuid(),<br />
                    &nbsp;&nbsp;vendor_id UUID <span className="text-pink-400">REFERENCES</span> users(id) <span className="text-pink-400">ON DELETE CASCADE</span>,<br />
                    &nbsp;&nbsp;name <span className="text-blue-400">VARCHAR(255) NOT NULL</span>,<br />
                    &nbsp;&nbsp;category tour_cat_enum <span className="text-pink-400">NOT NULL</span>,<br />
                    &nbsp;&nbsp;difficulty difficulty_enum <span className="text-pink-400">NOT NULL</span>,<br />
                    &nbsp;&nbsp;description <span className="text-blue-400">TEXT NOT NULL</span>,<br />
                    &nbsp;&nbsp;region <span className="text-blue-400">VARCHAR(100) NOT NULL</span>,<br />
                    &nbsp;&nbsp;is_approved <span className="text-pink-400">BOOLEAN DEFAULT FALSE</span>,<br />
                    &nbsp;&nbsp;duration_days <span className="text-pink-400">INT DEFAULT</span> 1<br />
                    );
                  </div>

                  <div>
                    <span className="text-emerald-500">-- 4. Create Tour Slots Table</span><br />
                    <span className="text-pink-400">CREATE TABLE</span> tour_slots (<br />
                    &nbsp;&nbsp;id UUID <span className="text-pink-400">PRIMARY KEY</span> DEFAULT gen_random_uuid(),<br />
                    &nbsp;&nbsp;tour_id UUID <span className="text-pink-400">REFERENCES</span> tours(id) <span className="text-pink-400">ON DELETE CASCADE</span>,<br />
                    &nbsp;&nbsp;start_date <span className="text-pink-400">DATE NOT NULL</span>,<br />
                    &nbsp;&nbsp;price <span className="text-pink-400">DECIMAL(10,2) NOT NULL</span>,<br />
                    &nbsp;&nbsp;capacity <span className="text-pink-400">INT NOT NULL</span>,<br />
                    &nbsp;&nbsp;booked_count <span className="text-pink-400">INT DEFAULT</span> 0<br />
                    );
                  </div>

                  <div>
                    <span className="text-emerald-500">-- 5. Bookings (With Foreign Keys & Indexes)</span><br />
                    <span className="text-pink-400">CREATE TABLE</span> bookings (<br />
                    &nbsp;&nbsp;id UUID <span className="text-pink-400">PRIMARY KEY DEFAULT</span> gen_random_uuid(),<br />
                    &nbsp;&nbsp;slot_id UUID <span className="text-pink-400">REFERENCES</span> tour_slots(id),<br />
                    &nbsp;&nbsp;customer_id UUID <span className="text-pink-400">REFERENCES</span> users(id),<br />
                    &nbsp;&nbsp;participants_count <span className="text-pink-400">INT DEFAULT</span> 1,<br />
                    &nbsp;&nbsp;total_amount <span className="text-pink-400">DECIMAL(10,2) NOT NULL</span>,<br />
                    &nbsp;&nbsp;status booking_status_enum <span className="text-pink-400">DEFAULT</span> 'pending',<br />
                    &nbsp;&nbsp;created_at <span className="text-pink-400">TIMESTAMP DEFAULT</span> CURRENT_TIMESTAMP<br />
                    );<br />
                    <span className="text-emerald-500">-- Index for fast user queries</span><br />
                    <span className="text-pink-400">CREATE INDEX</span> idx_bookings_cust <span className="text-pink-400">ON</span> bookings(customer_id);
                  </div>

                  <div>
                    <span className="text-emerald-500">-- 6. Reviews (Ensuring 1 Verified review per booking)</span><br />
                    <span className="text-pink-400">CREATE TABLE</span> reviews (<br />
                    &nbsp;&nbsp;id UUID <span className="text-pink-400">PRIMARY KEY DEFAULT</span> gen_random_uuid(),<br />
                    &nbsp;&nbsp;tour_id UUID <span className="text-pink-400">REFERENCES</span> tours(id) <span className="text-pink-400">ON DELETE CASCADE</span>,<br />
                    &nbsp;&nbsp;booking_id UUID <span className="text-pink-400">UNIQUE REFERENCES</span> bookings(id) <span className="text-pink-400">ON DELETE CASCADE</span>,<br />
                    &nbsp;&nbsp;customer_id UUID <span className="text-pink-400">REFERENCES</span> users(id),<br />
                    &nbsp;&nbsp;rating <span className="text-pink-400">INT CHECK</span> (rating &gt;= 1 AND rating &lt;= 5),<br />
                    &nbsp;&nbsp;comment <span className="text-blue-400">TEXT</span>,<br />
                    &nbsp;&nbsp;created_at <span className="text-pink-400">TIMESTAMP DEFAULT</span> CURRENT_TIMESTAMP<br />
                    );
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: LOCAL INTEGRATIONS */}
        {activeTab === 'local-integrations' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Payment Gateways Card */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Azərbaycan Ödəniş Sistemləri İnteqrasiyası</h4>
                </div>
                
                <p className="text-slate-300 text-xs leading-relaxed">
                  Platformada Azərbaycanın aparıcı ödəniş platformaları (Pasha Bank E-Commerce Portal, GoldenPay / Portmanat, E-pul) üçün 3-D Secure xidmət inteqrasiyası tətbiq olunacaqdır.
                </p>

                <div className="space-y-4">
                  <div className="bg-slate-900 p-4 rounded border border-slate-800 text-xs space-y-2">
                    <strong className="text-emerald-400 font-mono block">Step 1: Pasha Bank Merchant API Calling</strong>
                    <p className="text-slate-400">
                      Müştəri ödə-ni seçdikdə, server-side `/api/payment/initiate` istiqamətində kart məlumatları və məbləğlə istək göndərilir, Pasha Bank serveri bizə <code className="text-emerald-400">transaction_id</code> və <code className="text-amber-400">3D-Secure URL</code> qaytarır.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-4 rounded border border-slate-800 text-xs space-y-2">
                    <strong className="text-emerald-400 font-mono block">Step 2: Client Redirect & Webhook Validation</strong>
                    <p className="text-slate-400">
                      Son alıcı bank portalında kodu təsdiqlədikdən sonra bank tərəfindən serverimizdəki HTTPS <code className="text-emerald-400">/api/payment/webhook</code> endpoint-inə kriptoqrafik imzalanmış sorğu (HMAC-SHA256) gəlir. Biz bu imzanı yoxlayıb, tranzaksiyanı təsdiq edirik.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded font-mono text-[10px] text-slate-400 border border-slate-800">
                  <div className="text-emerald-500">// Pasha Bank Callback Signature Verification (NodeJS / Express)</div>
                  <div>const crypto = require('crypto');</div>
                  <div>const hash = crypto.createHmac('sha256', process.env.PASHA_SECRET_KEY)</div>
                  <div>&nbsp;&nbsp;.update(JSON.stringify(req.body.data))</div>
                  <div>&nbsp;&nbsp;.digest('hex');</div>
                  <div>if (hash === req.headers['x-pasha-signature']) &#123;</div>
                  <div>&nbsp;&nbsp;// Transaction is verified! Update booking status strictly.</div>
                  <div>&nbsp;&nbsp;await db.bookings.update(&#123; status: 'paid' &#125;);</div>
                  <div>&#125;</div>
                </div>
              </div>

              {/* SMS Gateways Card */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Lokal SMS Provaider İnteqrasiyası</h4>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  Tur rezervasiyaları, status dəyişiklikləri və admin təsdiq mesajları Azərbaycanın rəsmi SMS provayderləri (məsələn LioSMS, Delta Telecom, Azercell/Bakcell korporativ geytveyləri) vasitəsilə dərhal göndərilir.
                </p>

                <div className="bg-slate-900 p-4 rounded border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="p-0.5 px-1 bg-emerald-500/10 text-emerald-400 rounded">Failover Strategy</span>
                    <span>SMS göndərilməsi asinxron şəkildə <code>RabbitMQ/Redis Celery Queue</code> ilə tamamlanır. Əgər Pasha Bank ödənişi təsdiqləsə də lokal SMS provayderində tıxac yaşansa, sorğu itmir və provayder çökmələri zamanı təkrar cəhd (Retry) edilir.</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded font-mono text-[10px] text-slate-400 border border-slate-800">
                  <div className="text-emerald-500">// LioSMS API integration Sample Request Payload</div>
                  <div>POST https://api.liosms.az/v1/send</div>
                  <div>Headers: &#123; "Authorization": "Bearer LIO_SECRET_API_KEY" &#125;</div>
                  <div>Body: &#123;</div>
                  <div>&nbsp;&nbsp;"sender": "GEDEKGORE",</div>
                  <div>&nbsp;&nbsp;"recipient": "+994998887766",</div>
                  <div>&nbsp;&nbsp;"text": "Hörmətli Zahir Tanrıverdi, Kuzun-Laza turu üzrə ödənişiniz (24 AZN) uğurla qəbul edildi! Bilet: #B-9832",</div>
                  <div>&nbsp;&nbsp;"scheduled_time": null</div>
                  <div>&#125;</div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
