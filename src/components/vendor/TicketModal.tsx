import React from 'react';
import { Tour, Booking } from '../../types';
import { CheckCircle, Clock, FileText, Printer, Send, ShieldCheck, X } from 'lucide-react';

interface TicketModalProps {
  booking: Booking | null;
  tours: Tour[];
  onApproveBooking?: (bookingId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  triggerTicketGeneration: (booking: Booking, tourName?: string, region?: string, date?: string) => Promise<string | undefined>;
  onUpdateBooking: React.Dispatch<React.SetStateAction<Booking | null>>;
}

export function TicketModal({ booking, tours, onApproveBooking, onShowNotification, triggerTicketGeneration, onUpdateBooking }: TicketModalProps) {
  if (!booking) return null;

        const tBooking = booking;
        const linkedTour = tours.find(t => t.id === tBooking.tourId);
        const tourName = linkedTour?.name || 'Naməlum Tur';
        const tourRegion = linkedTour?.region || 'Azərbaycan';
        const bookingRef = tBooking.booking_reference || `TUR-${tBooking.id.slice(0, 5).toUpperCase()}`;

        const ticketPdfUrl = `${window.location.protocol}//${window.location.host}/tickets/ticket_${tBooking.id}.pdf`;

        // Create the pre-filled Whatsapp text
        const whatsappMsg = `*GEDƏKGÖRƏK - ELEKTRON BİLET*\n\n- *Bilet (Sifariş ID):* #${bookingRef}\n- *Tur:* ${tourName}\n- *Tarix:* ${tBooking.bookingDate}\n- *İştirakçı:* ${tBooking.participantsCount} nəfər\n- *Məbləğ:* ${tBooking.totalAmount} AZN (${tBooking.status === 'paid' ? 'ÖDƏNİLİB [Təsdiqlənib]' : 'GÖZLƏYİR [Ödənilməyib]'})\n- *Müştəri:* ${tBooking.customerName} (${tBooking.customerPhone})\n\n📲 *Elektron Biletiniz (PDF):* ${ticketPdfUrl}\n\n*MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI VƏ TƏLİMATLAR:*\n1. Bələdçinin verdiyi təhlükəsizlik və yürüş təlimatlarına 100% əməl edilməlidir.\n2. Hava şəraitinə uyğun geyim və sürüşməyən rahat yürüş ayaqqabısı geyinilməlidir.\n3. Təbiətə hörmətlə yanaşılmalı, heç bir növ zibil dağ və meşə sahələrinə atılmamalıdır.\n4. Xroniki xəstəlik, astma, ürək narahatlığı barədə bələdçiyə mütləq öncədən məlumat verilməlidir.\n5. Yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.\n\nBiletiniz təsdiqləndi! Çıxış nöqtəsində bu bilet təqdim edilməlidir. Uğurlu yolculuqlar!`;

        // Direct Clean Print Trigger function
        const handlePrintTicket = async () => {
          if (onShowNotification) {
            onShowNotification('Rəsmi Elektron Bilet PDF olaraq hazırlanır, zəhmət olmasa gözləyin...', 'info');
          }
          try {
            const ticketUrl = await triggerTicketGeneration(
              tBooking,
              tourName,
              tourRegion,
              tBooking.bookingDate
            );
            if (ticketUrl) {
              const fullUrl = `${window.location.protocol}//${window.location.host}${ticketUrl}`;
              const link = document.createElement('a');
              link.href = fullUrl;
              link.setAttribute('download', `bilet_${bookingRef}.pdf`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              return;
            }
          } catch (err) {
            console.error("PDF generator error:", err);
          }

          // Fallback to client-side HTML popup printing in case of error
          const printWindow = window.open('', '_blank', 'width=850,height=950');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>GedəkGörək Elektron Bilet - #${bookingRef}</title>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
                  <style>
                    @page {
                      size: A4 portrait;
                      margin: 15mm 10mm;
                    }
                    * {
                      box-sizing: border-box;
                    }
                    body {
                      font-family: 'Inter', sans-serif;
                      background: #f8fafc;
                      color: #0f172a;
                      margin: 0;
                      padding: 20px;
                      line-height: 1.5;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    
                    /* Boarding Pass Container */
                    .boarding-pass {
                      max-width: 650px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 20px;
                      border: 1px solid #e2e8f0;
                      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                      overflow: hidden;
                      position: relative;
                      margin-bottom: 24px;
                    }
                    
                    /* Brand Header */
                    .brand-bar {
                      background: #064e3b; /* Deep forest emerald */
                      color: #ffffff;
                      padding: 16px 28px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    }
                    .brand-logo-text {
                      font-family: 'Space Grotesk', sans-serif;
                      font-weight: 700;
                      font-size: 18px;
                      letter-spacing: -0.5px;
                      text-transform: uppercase;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                    }
                    .brand-logo-text span {
                      color: #34d399; /* Emerald accent */
                    }
                    .badge {
                      background: #34d399;
                      color: #064e3b;
                      padding: 6px 14px;
                      font-weight: 800;
                      border-radius: 9999px;
                      font-size: 10px;
                      letter-spacing: 0.5px;
                      text-transform: uppercase;
                    }
                    .badge.unpaid {
                      background: #fef3c7;
                      color: #92400e;
                    }
                    
                    /* Pass Body Layout */
                    .pass-body {
                      display: flex;
                      position: relative;
                    }
                    
                    /* Circular punch cuts */
                    .notch-top {
                      width: 20px;
                      height: 20px;
                      background: #f8fafc;
                      border-radius: 50%;
                      position: absolute;
                      top: -10px;
                      right: 170px;
                      z-index: 10;
                      border-bottom: 1px solid #e2e8f0;
                    }
                    .notch-bottom {
                      width: 20px;
                      height: 20px;
                      background: #f8fafc;
                      border-radius: 50%;
                      position: absolute;
                      bottom: -10px;
                      right: 170px;
                      z-index: 10;
                      border-top: 1px solid #e2e8f0;
                    }
                    
                    /* Main stub (Left) */
                    .main-stub {
                      flex: 1;
                      padding: 24px 28px;
                      border-right: 2px dashed #cbd5e1;
                    }
                    
                    /* Right Stub (Validator) */
                    .side-stub {
                      width: 180px;
                      padding: 24px 20px;
                      background: #fafbfd;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: space-between;
                      text-align: center;
                      flex-shrink: 0;
                    }
                    
                    /* Ride Details Route Graphic */
                    .route-section {
                      display: flex;
                      align-items: center;
                      gap: 15px;
                      margin-bottom: 24px;
                      padding-bottom: 20px;
                      border-bottom: 1px solid #e2e8f0;
                    }
                    .route-point {
                      display: flex;
                      flex-direction: column;
                    }
                    .route-label {
                      font-size: 9px;
                      color: #64748b;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                    }
                    .route-value {
                      font-size: 14px;
                      font-weight: 800;
                      color: #0f172a;
                      margin-top: 2px;
                    }
                    .route-arrow {
                      color: #059669;
                      font-size: 18px;
                      font-weight: 700;
                    }
                    
                    /* Information details grid */
                    .details-grid {
                      display: grid;
                      grid-template-cols: 1fr 1fr;
                      gap: 16px;
                    }
                    .info-cell {
                      display: flex;
                      flex-direction: column;
                    }
                    .info-label {
                      font-size: 9px;
                      color: #627285;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin-bottom: 3px;
                    }
                    .info-value {
                      font-size: 12px;
                      font-weight: 700;
                      color: #0f172a;
                    }
                    .price-highlight {
                      color: #047857;
                      font-weight: 800;
                      font-size: 15px;
                    }
                    
                    /* QR style on stub */
                    .qr-wrapper {
                      background: #ffffff;
                      border: 1px solid #e2e8f0;
                      padding: 10px;
                      border-radius: 12px;
                      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                      margin-top: 10px;
                    }
                    .qr-image {
                      width: 110px;
                      height: 110px;
                      display: block;
                    }
                    .ref-title {
                      font-size: 9px;
                      color: #64748b;
                      font-weight: 800;
                      margin-bottom: 4px;
                    }
                    .ref-id {
                      font-family: monospace;
                      font-size: 13px;
                      font-weight: 700;
                      color: #0f172a;
                      letter-spacing: 0.5px;
                    }
                    
                    /* Safety Panel */
                    .safety-panel {
                      max-width: 650px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 16px;
                      border: 1px solid #e1e8f0;
                      padding: 20px 24px;
                    }
                    .safety-title {
                      font-size: 11px;
                      font-weight: 800;
                      color: #92400e;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin: 0 0 12px 0;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                    }
                    .safety-list {
                      margin: 0;
                      padding-left: 18px;
                    }
                    .safety-list li {
                      font-size: 10.5px;
                      color: #475569;
                      margin-bottom: 6px;
                      line-height: 1.45;
                      font-weight: 500;
                    }
                    
                    /* Pass footer */
                    .pass-footer {
                      text-align: center;
                      font-size: 9px;
                      color: #94a3b8;
                      margin-top: 30px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                    }
                    
                    @media print {
                      body {
                        background: #ffffff;
                        padding: 0;
                        margin: 0;
                      }
                      .boarding-pass {
                        box-shadow: none !important;
                        border: 1px solid #94a3b8 !important;
                      }
                      .safety-panel {
                        border: 1px solid #94a3b8 !important;
                      }
                    }
                  </style>
                </head>
                <body onload="window.print()">
                  
                  <div class="boarding-pass">
                    <div class="brand-bar">
                      <div class="brand-logo-text">🌲 GEDƏK<span>GÖRƏK</span></div>
                      <div class="badge \${tBooking.status === 'paid' ? 'paid' : 'unpaid'}">
                        \${tBooking.status === 'paid' ? 'ÖDƏNİLİB VƏ TƏSDİQLƏNİB' : 'GÖZLƏMƏDƏ'}
                      </div>
                    </div>
                    
                    <div class="pass-body">
                      <div class="notch-top"></div>
                      <div class="notch-bottom"></div>
                      
                      {/* Left Block */}
                      <div class="main-stub">
                        <div class="route-section">
                          <div class="route-point">
                            <span class="route-label">ÇIXIŞ</span>
                            <span class="route-value">Bakı, Gənclik</span>
                          </div>
                          <div class="route-arrow">➔</div>
                          <div class="route-point">
                            <span class="route-label">HƏDƏF MARŞRUT</span>
                            <span class="route-value">${tourName}</span>
                          </div>
                        </div>
                        
                        <div class="details-grid">
                          <div class="info-cell">
                            <span class="info-label">Sərnişin (Ad Soyad)</span>
                            <span class="info-value">${tBooking.customerName}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Əlaqə Nömrəsi</span>
                            <span class="info-value">\${tBooking.customerPhone}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Ekskursiya Tarixi</span>
                            <span class="info-value font-mono">\${tBooking.bookingDate}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">İştirakçı Sayı</span>
                            <span class="info-value">\${tBooking.participantsCount} Nəfər</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Ümumi Ödəniş</span>
                            <span class="info-value price-highlight">₼\${tBooking.totalAmount} AZN</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">Nəqliyyat Klası</span>
                            <span class="info-value">Komfortlu Tur Sprinteri</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Stub Area */}
                      <div class="side-stub">
                        <div>
                          <div class="ref-title">SİFARİŞ ID</div>
                          <div class="ref-id">#${bookingRef}</div>
                        </div>
                        
                        <div class="qr-wrapper">
                          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingRef}" alt="Verification Qrcode" />
                        </div>
                        
                        <div style="font-size: 8px; color: #94a3b8; font-weight: 700; margin-top: 8px; letter-spacing: 0.3px; text-transform: uppercase;">
                          Validasiya üçün QR kod
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="safety-panel">
                    <h4 class="safety-title">⚠️ Mühüm Təhlükəsizlik Qaydaları və Təlimatlar</h4>
                    <ul class="safety-list">
                      <li>Bələdçinin verdiyi bütün yürüş və təhlükəsizlik təlimatlarına 100% əməl edilməlidir.</li>
                      <li>Dağlıq/meşəlik ərazilərdə hava şəraitinə uyğun geyim və sürüşməyən dabanı rahat yürüş ayaqqabısı (trekkinq) geyinilməlidir.</li>
                      <li>Təbiətə yüksək hörmətlə yanaşılmalı, heç bir növ plastık və ya digər zibil dağ və meşə sahələrinə atılmamalıdır.</li>
                      <li>Əgər tibbi xroniki bir narahatlığınız, astma, ürək narahatlığı varsa, bələdçiyə mütləq öncədən məlumat verilməlidir.</li>
                      <li>Nəqliyyatda və yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.</li>
                    </ul>
                  </div>
                  
                  <div class="pass-footer">
                    GEDEKGOREK.AZ • Təbiət turları portalı bilet xidməti
                  </div>
                  
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        };

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onUpdateBooking(null);
              }
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs tracking-wider">Müştəri Bileti Redaktoru (WhatsApp)</h3>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">BİLET REF ID: #{bookingRef}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateBooking(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 flex-1">
                
                {/* Visual Status Indicator */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  tBooking.status === 'paid' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] tracking-wider font-extrabold text-slate-500">Mövcud Ödəniş Statusu</span>
                    <h4 className="font-extrabold flex items-center gap-1 text-xs">
                      {tBooking.status === 'paid' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Təsdiqlənib (Ödəniş qəbul olunub)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                          <span>WhatsApp Gözləmədə (Klik statusu)</span>
                        </>
                      )}
                    </h4>
                  </div>

                  {tBooking.status !== 'paid' && onApproveBooking && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onApproveBooking(tBooking.id);
                          onUpdateBooking(prev => prev ? { ...prev, status: 'paid' } : null);
                        } catch {
                          // App.tsx's handleApproveBooking already showed an error toast
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 hover:scale-105 transition-all text-white font-extrabold text-[10px] rounded-lg shadow-sm cursor-pointer"
                    >
                      Ödənişi Qəbul Et və Təsdiqlə ☑
                    </button>
                  )}
                </div>

                {/* Ticket Mock Render */}
                <div id="printable-voucher-area" className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden relative">
                  
                  {/* Brand Header */}
                  <div className="bg-emerald-900 px-6 py-4 flex justify-between items-center text-white select-none">
                    <div className="font-sans font-extrabold text-sm tracking-widest flex items-center gap-1">
                      🌲 GEDƏK<span className="text-emerald-400">GÖRƏK</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider ${
                      tBooking.status === 'paid' ? 'bg-emerald-450 bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tBooking.status === 'paid' ? 'ÖDƏNİLİB VƏ TƏSDİQLƏNİB 🎫' : 'GÖZLƏMƏDƏ ⏳'}
                    </span>
                  </div>

                  {/* Body Wrapper with notched tickets effect */}
                  <div className="flex flex-col md:flex-row relative bg-white border-b border-slate-100">
                    
                    {/* Circle punch-out notches */}
                    <div className="hidden md:block w-4 h-4 rounded-full bg-slate-100/30 bg-slate-50 border border-slate-200/50 absolute -top-2 right-[152px] z-10" />
                    <div className="hidden md:block w-4 h-4 rounded-full bg-slate-100/30 bg-slate-50 border border-slate-200/50 absolute -bottom-2 right-[152px] z-10" />

                    {/* Main Part (Left) */}
                    <div className="flex-1 p-6 md:border-r md:border-dashed md:border-slate-200 text-xs">
                      {/* Vertical line route indicator */}
                      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Çıxış</span>
                          <strong className="text-slate-800 text-xs">Bakı (Gənclik m.)</strong>
                        </div>
                        <div className="text-emerald-600 font-extrabold">➔</div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Marşrut</span>
                          <strong className="text-slate-800 text-xs">{tourName}</strong>
                        </div>
                      </div>

                      {/* Details info grid */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-[11px]">
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Sərnişin</span>
                          <strong className="text-slate-900 text-xs">{tBooking.customerName}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Əlaqə</span>
                          <strong className="text-slate-900 text-xs font-mono font-semibold">{tBooking.customerPhone}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Yürüş Tarixi</span>
                          <strong className="text-slate-905 text-slate-900 text-xs font-mono">{tBooking.bookingDate}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Yer sayı</span>
                          <strong className="text-slate-900 text-xs">{tBooking.participantsCount} Nəfər</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Ümumi Məbləğ</span>
                          <strong className="text-emerald-700 text-sm font-black font-mono">{tBooking.totalAmount} ₼</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">Nəqliyyat Klası</span>
                          <strong className="text-slate-800 text-[11px]">Sprinter / Bus</strong>
                        </div>
                      </div>
                    </div>

                    {/* Stub Area (Right) */}
                    <div className="w-full md:w-[160px] p-6 bg-slate-50/50 flex flex-col items-center justify-between text-center shrink-0">
                      <div>
                        <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">SİFARİŞ NO</span>
                        <strong className="text-slate-800 text-sm font-mono tracking-wide">#{bookingRef}</strong>
                      </div>

                      <div className="my-4 bg-white p-2 rounded-xl border border-slate-150 shadow-xs">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${bookingRef}`} 
                          className="w-20 h-20 block shrink-0" 
                          alt="Validation QR" 
                        />
                      </div>

                      <span className="text-[7.5px] font-bold text-slate-400 block tracking-wider">
                        Keçid zamanı skan edin
                      </span>
                    </div>

                  </div>

                  {/* Safety instructions and notes */}
                  <div className="p-5 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-t border-slate-100">
                    <h5 className="font-extrabold text-amber-900 text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>🛡️ MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI</span>
                    </h5>
                    <ol className="list-decimal pl-4 space-y-1 text-[10px] text-slate-600 font-medium">
                      <li>Bələdçinin verdiyi bütün təlimatlara 100% əməl edilməlidir.</li>
                      <li>Hava şəraitinə uyğun geyim və sürüşməyən rahat yürüş ayaqqabısı geyinilməlidir.</li>
                      <li>Təbiətə hörmətlə yanaşılmalı, zibillər dağ sahələrinə atılmamalıdır.</li>
                      <li>Yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır.</li>
                    </ol>
                  </div>

                </div>

                {/* Pre-drafted clipboard view */}
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <label className="block text-[10px] font-extrabold text-slate-400">WhatsApp Mesajı Önizləmə:</label>
                  <textarea 
                    readOnly
                    value={whatsappMsg}
                    className="w-full h-24 p-2.5 bg-slate-900 text-slate-300 font-mono text-[9px] rounded-lg border border-slate-800 focus:outline-none"
                  />
                </div>

                {/* WhatsApp Attachment Instructions Info Box */}
                <div className="bg-amber-50/50 border border-amber-250 p-3 rounded-xl max-w-lg mx-auto flex items-start gap-2.5 text-[11px] text-amber-900 leading-normal">
                  <span className="text-sm select-none">💡</span>
                  <div>
                    <strong className="font-bold block mb-0.5 text-amber-950">Cihazdan WhatsApp-a Fayl Qoşma Təlimatı:</strong>
                    Rəsmi təhlükəsizlik qaydalarına əsasən, veb saytlar birbaşa olaraq lokal PDF faylını şifrəli WhatsApp şəbəkəsinə yükləyə bilməz. Biz PDF-i sizin üçün tərtib edib endiririk, siz isə açılan söhbət pəncərəsində <strong className="font-bold">həmin endirilmiş PDF faylını mesaj yerinə əlavə (fayl qoşması / attachment) edib</strong> müştəriyə asanlıqla göndərə bilərsiniz.
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappMsg);
                    if (onShowNotification) onShowNotification('Sifariş ödəniş bileti mətni kopyalandı!', 'success');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Kopyala
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Print / Save PDF */}
                  <button
                    type="button"
                    onClick={handlePrintTicket}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span>PDF Bilet Yüklə / Çap et</span>
                  </button>

                  {/* Send WhatsApp ticket directly to customer */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (onShowNotification) {
                        onShowNotification('Elektron Bilet PDF-i CRM serverində hazırlanır və WhatsApp söhbəti başladılır! Müştəriyə birbaşa biletinizin PDF linki göndəriləcək.', 'success');
                      }
                      
                      try {
                        // 1. Instantly trigger PDF generation in the backend so it's fresh and correct
                        await triggerTicketGeneration(tBooking, tourName, tourRegion, tBooking.bookingDate);
                      } catch (err) {
                        console.error("PDF generation failed:", err);
                      }
                      
                      // 2. Open WhatsApp with the link
                      let cleanPhone = tBooking.customerPhone.replace(/\D/g, '');
                      if (cleanPhone.startsWith('0')) {
                        cleanPhone = '994' + cleanPhone.slice(1);
                      } else if (cleanPhone.length === 9) {
                        cleanPhone = '994' + cleanPhone;
                      }
                      
                      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md shadow-emerald-100"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp ilə Müştəriyə Göndər</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        );

}
