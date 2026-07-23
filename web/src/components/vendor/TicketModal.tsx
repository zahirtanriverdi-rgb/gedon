'use client';
import React from 'react';
import { Tour, Booking } from '../../types';
import { CheckCircle, Clock, FileText, Printer, Send, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TicketModalProps {
  booking: Booking | null;
  tours: Tour[];
  onApproveBooking?: (bookingId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  triggerTicketGeneration: (booking: Booking, tourName?: string, region?: string, date?: string) => Promise<string | undefined>;
  onUpdateBooking: React.Dispatch<React.SetStateAction<Booking | null>>;
}

export function TicketModal({ booking, tours, onApproveBooking, onShowNotification, triggerTicketGeneration, onUpdateBooking }: TicketModalProps) {
  const { t } = useLanguage();

  if (!booking) return null;

        const tBooking = booking;
        const linkedTour = tours.find(t => t.id === tBooking.tourId);
        const tourName = linkedTour?.name || t('vendorBookings.ticketModal.unknownTour');
        const tourRegion = linkedTour?.region || t('vendorBookings.ticketModal.defaultRegion');
        const bookingRef = tBooking.booking_reference || `TUR-${tBooking.id.slice(0, 5).toUpperCase()}`;

        const ticketPdfUrl = `${window.location.protocol}//${window.location.host}/tickets/ticket_${tBooking.id}.pdf`;

        // Create the pre-filled Whatsapp text
        const whatsappMsg = `*${t('vendorBookings.ticketModal.whatsappMsg.header')}*\n\n- *${t('vendorBookings.ticketModal.whatsappMsg.ticketIdLabel')}:* #${bookingRef}\n- *${t('vendorBookings.ticketModal.whatsappMsg.tourLabel')}:* ${tourName}\n- *${t('vendorBookings.ticketModal.whatsappMsg.dateLabel')}:* ${tBooking.bookingDate}\n- *${t('vendorBookings.ticketModal.whatsappMsg.participantsLabel')}:* ${t('vendorBookings.crmTab.metrics.peopleCount', { count: tBooking.participantsCount })}\n- *${t('vendorBookings.ticketModal.whatsappMsg.amountLabel')}:* ${tBooking.totalAmount} AZN (${tBooking.status === 'paid' ? t('vendorBookings.ticketModal.whatsappMsg.paidBadge') : t('vendorBookings.ticketModal.whatsappMsg.pendingBadge')})\n- *${t('vendorBookings.ticketModal.whatsappMsg.customerLabel')}:* ${tBooking.customerName} (${tBooking.customerPhone})\n\n📲 *${t('vendorBookings.ticketModal.whatsappMsg.pdfLabel')}:* ${ticketPdfUrl}\n\n*${t('vendorBookings.ticketModal.whatsappMsg.safetyTitle')}:*\n1. ${t('vendorBookings.ticketModal.whatsappMsg.safetyRule1')}\n2. ${t('vendorBookings.ticketModal.whatsappMsg.safetyRule2')}\n3. ${t('vendorBookings.ticketModal.whatsappMsg.safetyRule3')}\n4. ${t('vendorBookings.ticketModal.whatsappMsg.safetyRule4')}\n5. ${t('vendorBookings.ticketModal.whatsappMsg.safetyRule5')}\n\n${t('vendorBookings.ticketModal.whatsappMsg.footer')}`;

        // Direct Clean Print Trigger function
        const handlePrintTicket = async () => {
          if (onShowNotification) {
            onShowNotification(t('vendorBookings.ticketModal.notifications.preparingPdf'), 'info');
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
                  <title>${t('vendorBookings.ticketModal.printDoc.pageTitle', { ref: bookingRef })}</title>
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
                      background: #f9fbfb;
                      color: #0d1c1e;
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
                      border: 1px solid #e4efef;
                      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                      overflow: hidden;
                      position: relative;
                      margin-bottom: 24px;
                    }
                    
                    /* Brand Header */
                    .brand-bar {
                      background: #1c6e78; /* Deep forest emerald */
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
                      color: #67d0dc; /* Emerald accent */
                    }
                    .badge {
                      background: #67d0dc;
                      color: #1c6e78;
                      padding: 6px 14px;
                      font-weight: 800;
                      border-radius: 9999px;
                      font-size: 10px;
                      letter-spacing: 0.5px;
                      text-transform: uppercase;
                    }
                    .badge.unpaid {
                      background: #fff4eb;
                      color: #9f4800;
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
                      background: #f9fbfb;
                      border-radius: 50%;
                      position: absolute;
                      top: -10px;
                      right: 170px;
                      z-index: 10;
                      border-bottom: 1px solid #e4efef;
                    }
                    .notch-bottom {
                      width: 20px;
                      height: 20px;
                      background: #f9fbfb;
                      border-radius: 50%;
                      position: absolute;
                      bottom: -10px;
                      right: 170px;
                      z-index: 10;
                      border-top: 1px solid #e4efef;
                    }
                    
                    /* Main stub (Left) */
                    .main-stub {
                      flex: 1;
                      padding: 24px 28px;
                      border-right: 2px dashed #cbe4e3;
                    }
                    
                    /* Right Stub (Validator) */
                    .side-stub {
                      width: 180px;
                      padding: 24px 20px;
                      background: #f9fbfb;
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
                      border-bottom: 1px solid #e4efef;
                    }
                    .route-point {
                      display: flex;
                      flex-direction: column;
                    }
                    .route-label {
                      font-size: 9px;
                      color: #579598;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                    }
                    .route-value {
                      font-size: 14px;
                      font-weight: 800;
                      color: #0d1c1e;
                      margin-top: 2px;
                    }
                    .route-arrow {
                      color: #2aa8b7;
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
                      color: #579598;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin-bottom: 3px;
                    }
                    .info-value {
                      font-size: 12px;
                      font-weight: 700;
                      color: #0d1c1e;
                    }
                    .price-highlight {
                      color: #24909d;
                      font-weight: 800;
                      font-size: 15px;
                    }
                    
                    /* QR style on stub */
                    .qr-wrapper {
                      background: #ffffff;
                      border: 1px solid #e4efef;
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
                      color: #579598;
                      font-weight: 800;
                      margin-bottom: 4px;
                    }
                    .ref-id {
                      font-family: monospace;
                      font-size: 13px;
                      font-weight: 700;
                      color: #0d1c1e;
                      letter-spacing: 0.5px;
                    }
                    
                    /* Safety Panel */
                    .safety-panel {
                      max-width: 650px;
                      margin: 0 auto;
                      background: #ffffff;
                      border-radius: 16px;
                      border: 1px solid #e4efef;
                      padding: 20px 24px;
                    }
                    .safety-title {
                      font-size: 11px;
                      font-weight: 800;
                      color: #9f4800;
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
                      color: #406e70;
                      margin-bottom: 6px;
                      line-height: 1.45;
                      font-weight: 500;
                    }
                    
                    /* Pass footer */
                    .pass-footer {
                      text-align: center;
                      font-size: 9px;
                      color: #8fbcbd;
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
                        border: 1px solid #8fbcbd !important;
                      }
                      .safety-panel {
                        border: 1px solid #8fbcbd !important;
                      }
                    }
                  </style>
                </head>
                <body onload="window.print()">
                  
                  <div class="boarding-pass">
                    <div class="brand-bar">
                      <div class="brand-logo-text">🌲 GOTABIAT</div>
                      <div class="badge \${tBooking.status === 'paid' ? 'paid' : 'unpaid'}">
                        \${tBooking.status === 'paid' ? '${t('vendorBookings.ticketModal.printDoc.paidConfirmedBadge')}' : '${t('vendorBookings.ticketModal.printDoc.pendingBadge')}'}
                      </div>
                    </div>

                    <div class="pass-body">
                      <div class="notch-top"></div>
                      <div class="notch-bottom"></div>

                      {/* Left Block */}
                      <div class="main-stub">
                        <div class="route-section">
                          <div class="route-point">
                            <span class="route-label">${t('vendorBookings.ticketModal.printDoc.departureLabel')}</span>
                            <span class="route-value">${t('vendorBookings.ticketModal.printDoc.departurePoint')}</span>
                          </div>
                          <div class="route-arrow">➔</div>
                          <div class="route-point">
                            <span class="route-label">${t('vendorBookings.ticketModal.printDoc.targetRouteLabel')}</span>
                            <span class="route-value">${tourName}</span>
                          </div>
                        </div>

                        <div class="details-grid">
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.passengerLabel')}</span>
                            <span class="info-value">${tBooking.customerName}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.contactNumberLabel')}</span>
                            <span class="info-value">\${tBooking.customerPhone}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.tourDateLabel')}</span>
                            <span class="info-value font-mono">\${tBooking.bookingDate}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.participantCountLabel')}</span>
                            <span class="info-value">\${tBooking.participantsCount} ${t('vendorBookings.ticketModal.printDoc.peopleUnit')}</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.totalPaymentLabel')}</span>
                            <span class="info-value price-highlight">₼\${tBooking.totalAmount} AZN</span>
                          </div>
                          <div class="info-cell">
                            <span class="info-label">${t('vendorBookings.ticketModal.printDoc.transportClassLabel')}</span>
                            <span class="info-value">${t('vendorBookings.ticketModal.printDoc.transportClassValue')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Stub Area */}
                      <div class="side-stub">
                        <div>
                          <div class="ref-title">${t('vendorBookings.ticketModal.printDoc.orderIdLabel')}</div>
                          <div class="ref-id">#${bookingRef}</div>
                        </div>

                        <div class="qr-wrapper">
                          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingRef}" alt="Verification Qrcode" />
                        </div>

                        <div style="font-size: 8px; color: #8fbcbd; font-weight: 700; margin-top: 8px; letter-spacing: 0.3px; text-transform: uppercase;">
                          ${t('vendorBookings.ticketModal.printDoc.qrValidationLabel')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="safety-panel">
                    <h4 class="safety-title">⚠️ ${t('vendorBookings.ticketModal.printDoc.safetyTitle')}</h4>
                    <ul class="safety-list">
                      <li>${t('vendorBookings.ticketModal.printDoc.safetyRule1')}</li>
                      <li>${t('vendorBookings.ticketModal.printDoc.safetyRule2')}</li>
                      <li>${t('vendorBookings.ticketModal.printDoc.safetyRule3')}</li>
                      <li>${t('vendorBookings.ticketModal.printDoc.safetyRule4')}</li>
                      <li>${t('vendorBookings.ticketModal.printDoc.safetyRule5')}</li>
                    </ul>
                  </div>

                  <div class="pass-footer">
                    ${t('vendorBookings.ticketModal.printDoc.footer')}
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 z-50"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50 sticky top-0 z-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-xs tracking-wider truncate">{t('vendorBookings.ticketModal.header.title')}</h3>
                    <p className="text-[10px] text-slate-500 font-bold font-mono truncate">{t('vendorBookings.ticketModal.header.refIdLabel')}: #{bookingRef}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateBooking(null)}
                  className="p-2 -mr-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-3 sm:p-5 space-y-5 flex-1">
                
                {/* Visual Status Indicator */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  tBooking.status === 'paid' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] tracking-wider font-extrabold text-slate-500">{t('vendorBookings.ticketModal.statusIndicator.currentStatusLabel')}</span>
                    <h4 className="font-extrabold flex items-center gap-1 text-xs">
                      {tBooking.status === 'paid' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>{t('vendorBookings.ticketModal.statusIndicator.confirmedLabel')}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                          <span>{t('vendorBookings.ticketModal.statusIndicator.pendingLabel')}</span>
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
                      {t('vendorBookings.ticketModal.buttons.approvePayment')} ☑
                    </button>
                  )}
                </div>

                {/* Ticket Mock Render */}
                <div id="printable-voucher-area" className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden relative">
                  
                  {/* Brand Header */}
                  <div className="bg-emerald-900 px-6 py-4 flex justify-between items-center text-white select-none">
                    <div className="font-sans font-extrabold text-sm tracking-widest flex items-center gap-1">
                     🌲 GOTABIAT
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider ${
                      tBooking.status === 'paid' ? 'bg-emerald-450 bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tBooking.status === 'paid' ? `${t('vendorBookings.ticketModal.printDoc.paidConfirmedBadge')} 🎫` : `${t('vendorBookings.ticketModal.printDoc.pendingBadge')} ⏳`}
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
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.printDoc.departureLabel')}</span>
                          <strong className="text-slate-800 text-xs">{t('vendorBookings.ticketModal.printDoc.departurePoint')}</strong>
                        </div>
                        <div className="text-emerald-600 font-extrabold">➔</div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.routeLabel')}</span>
                          <strong className="text-slate-800 text-xs">{tourName}</strong>
                        </div>
                      </div>

                      {/* Details info grid */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-[11px]">
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.passengerLabel')}</span>
                          <strong className="text-slate-900 text-xs">{tBooking.customerName}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.contactLabel')}</span>
                          <strong className="text-slate-900 text-xs font-mono font-semibold">{tBooking.customerPhone}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.tourDateLabel')}</span>
                          <strong className="text-slate-905 text-slate-900 text-xs font-mono">{tBooking.bookingDate}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.seatsLabel')}</span>
                          <strong className="text-slate-900 text-xs">{t('vendorBookings.crmTab.metrics.peopleCount', { count: tBooking.participantsCount })}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.printDoc.totalPaymentLabel')}</span>
                          <strong className="text-emerald-700 text-sm font-black font-mono">{tBooking.totalAmount} ₼</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.printDoc.transportClassLabel')}</span>
                          <strong className="text-slate-800 text-[11px]">{t('vendorBookings.ticketModal.ticketRender.transportClassValue')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Stub Area (Right) */}
                    <div className="w-full md:w-[160px] p-6 bg-slate-50/50 flex flex-col items-center justify-between text-center shrink-0">
                      <div>
                        <span className="block text-[8px] font-extrabold tracking-wider text-slate-400">{t('vendorBookings.ticketModal.ticketRender.orderNoLabel')}</span>
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
                        {t('vendorBookings.ticketModal.ticketRender.scanAtEntry')}
                      </span>
                    </div>

                  </div>

                  {/* Safety instructions and notes */}
                  <div className="p-5 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-t border-slate-100">
                    <h5 className="font-extrabold text-amber-900 text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>🛡️ {t('vendorBookings.ticketModal.printDoc.safetyTitle')}</span>
                    </h5>
                    <ol className="list-decimal pl-4 space-y-1 text-[10px] text-slate-600 font-medium">
                      <li>{t('vendorBookings.ticketModal.ticketRender.safetyRule1')}</li>
                      <li>{t('vendorBookings.ticketModal.ticketRender.safetyRule2')}</li>
                      <li>{t('vendorBookings.ticketModal.ticketRender.safetyRule3')}</li>
                      <li>{t('vendorBookings.ticketModal.ticketRender.safetyRule4')}</li>
                    </ol>
                  </div>

                </div>

                {/* Pre-drafted clipboard view */}
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <label className="block text-[10px] font-extrabold text-slate-400">{t('vendorBookings.ticketModal.clipboard.previewLabel')}</label>
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
                    <strong className="font-bold block mb-0.5 text-amber-950">{t('vendorBookings.ticketModal.attachmentInstructions.title')}</strong>
                    {t('vendorBookings.ticketModal.attachmentInstructions.body')} <strong className="font-bold">{t('vendorBookings.ticketModal.attachmentInstructions.bodyBold')}</strong> {t('vendorBookings.ticketModal.attachmentInstructions.bodyEnd')}
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center sticky bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappMsg);
                    if (onShowNotification) onShowNotification(t('vendorBookings.ticketModal.notifications.textCopied'), 'success');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t('vendorBookings.ticketModal.buttons.copy')}
                </button>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Print / Save PDF */}
                  <button
                    type="button"
                    onClick={handlePrintTicket}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span>{t('vendorBookings.ticketModal.buttons.downloadOrPrintPdf')}</span>
                  </button>

                  {/* Send WhatsApp ticket directly to customer */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (onShowNotification) {
                        onShowNotification(t('vendorBookings.ticketModal.notifications.pdfPreparingWhatsapp'), 'success');
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
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md shadow-emerald-100"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>{t('vendorBookings.ticketModal.buttons.sendWhatsapp')}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        );

}