'use client';
import React, { useState, useEffect } from 'react';
import { Tour, TourSlot, Booking, User } from '../../types';
import { QrScannerModal, playScanFeedback } from './QrScannerModal';
import { Calendar, CheckCircle, Copy, Download, FileText, Plus, Printer, Send, Trash2, Users, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface CrmTabProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  currentUser: User;
  operatorToken: string | null;
  onEditBooking?: (updatedBooking: Booking) => Promise<void>;
  onDeleteBooking?: (bookingId: string) => Promise<void>;
  onAddBooking?: (newBooking: Booking) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  triggerTicketGeneration: (booking: Booking, tourName?: string, region?: string, date?: string) => Promise<string | undefined>;
}

export function CrmTab({ tours, slots, bookings, currentUser, operatorToken, onEditBooking, onDeleteBooking, onAddBooking, onShowNotification, triggerTicketGeneration }: CrmTabProps) {
  const { t } = useLanguage();
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  const handleDeleteBooking = async (booking: Booking) => {
    if (!onDeleteBooking) return;
    const confirmed = window.confirm(t('vendorBookings.crmTab.table.deleteConfirm', { name: booking.customerName }));
    if (!confirmed) return;

    setDeletingBookingId(booking.id);
    try {
      await onDeleteBooking(booking.id);
    } catch {
      // onDeleteBooking (App.tsx) already showed an error toast
    } finally {
      setDeletingBookingId(null);
    }
  };

  // CRM & Tour Manifest States
  const [crmTourId, setCrmTourId] = useState<string>('');
  const [crmSlotId, setCrmSlotId] = useState<string>('');

  // CRM Advanced Filtering (Requirement 4)
  const [filterPayment, setFilterPayment] = useState<'Bütün' | 'Ödənilib' | 'Ödənilməyib'>('Bütün');

  // Manual Participant Modal (Requirement 3)
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualParticipantsCount, setManualParticipantsCount] = useState<number | ''>(1);
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'Ödənilib' | 'Ödənilməyib'>('Ödənilməyib');
  const [manualOperatorNote, setManualOperatorNote] = useState('');
  const [isSubmittingManualBooking, setIsSubmittingManualBooking] = useState(false);
  const [manualBookingError, setManualBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (crmTourId) {
      const activeSlots = slots.filter(s => s.tourId === crmTourId);
      // Only shift to a default slot if the current selection is invalid for the tour and not explicitly set to all/empty
      if (crmSlotId && !activeSlots.some(s => s.id === crmSlotId)) {
        if (activeSlots.length > 0) {
          setCrmSlotId(activeSlots[0].id);
        } else {
          setCrmSlotId('');
        }
      }
    } else {
      setCrmSlotId('');
    }
  }, [crmTourId, slots]);

  const selectedCrmTour = tours.find(t => t.id === crmTourId);
  const selectedCrmSlot = slots.find(s => s.id === crmSlotId);

  // Scan/check-in now hits the real backend (POST /api/bookings/checkin, JWT-protected)
  // instead of searching the client-side `bookings` array — the server looks the ticket
  // up itself and verifies it belongs to this operator's account before marking attendance.
  const handleQrScan = async (scannedText: string) => {
    setIsQrScannerOpen(false);

    if (!operatorToken) {
      playScanFeedback('error');
      if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.sessionExpired'), 'error');
      return;
    }

    try {
      const response = await fetch('/api/bookings/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ reference: scannedText }),
      });
      const data = await response.json();

      if (!response.ok) {
        playScanFeedback('error');
        if (onShowNotification) {
          onShowNotification(data.error || t('vendorBookings.crmTab.notifications.ticketNotFound'), 'error');
        }
        return;
      }

      if (data.alreadyCheckedIn) {
        playScanFeedback('duplicate');
        if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.alreadyCheckedIn'), 'warning');
        return;
      }

      if (onEditBooking) {
        await onEditBooking(data.booking);
      }
      playScanFeedback('success');
      if (onShowNotification) {
        onShowNotification(t('vendorBookings.crmTab.notifications.checkinSuccess', { name: data.booking.customerName, count: data.booking.participantsCount }), 'success');
      }
    } catch (err) {
      console.error('Check-in zamanı xəta baş verdi:', err);
      playScanFeedback('error');
      if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.checkinSystemError'), 'error');
    }
  };

  const activeCrmBookingsForSlot = !crmTourId
    ? bookings.filter(b => tours.filter(t => t.vendorId === currentUser.id).map(t => t.id).includes(b.tourId))
    : (!crmSlotId
        ? bookings.filter(b => b.tourId === crmTourId)
        : bookings.filter(b => b.slotId === crmSlotId));

  const filteredCrmBookingsForSlot = activeCrmBookingsForSlot.filter(b => {
    const payStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');
    if (filterPayment !== 'Bütün' && payStatus !== filterPayment) return false;
    return true;
  });
  const webBookingsCount = activeCrmBookingsForSlot
    .filter(b => b.status !== 'cancelled' && !b.id.startsWith('manual-') && b.paymentMethod !== 'Nağd / Kənar CRM')
    .reduce((sum, b) => sum + b.participantsCount, 0);

  const currentTourExternalSales = activeCrmBookingsForSlot
    .filter(b => b.status !== 'cancelled' && (b.id.startsWith('manual-') || b.paymentMethod === 'Nağd / Kənar CRM'))
    .reduce((sum, b) => sum + b.participantsCount, 0);

  const targetSlotCapacity = selectedCrmSlot?.capacity || 0;
  const remainingSeats = Math.max(0, targetSlotCapacity - webBookingsCount - currentTourExternalSales);

  return (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-widest flex items-center gap-2">
                  📊 {t('vendorBookings.crmTab.header.title')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('vendorBookings.crmTab.header.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('vendorBookings.crmTab.header.autoSaveNotice')}</span>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Tour Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📌 {t('vendorBookings.crmTab.controls.tourLabel')}</label>
                <select
                  value={crmTourId}
                  onChange={(e) => {
                    setCrmTourId(e.target.value);
                    setCrmSlotId('');
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
                >
                  <option value="">{t('vendorBookings.crmTab.controls.allToursOption')}</option>
                  {tours.filter(t => t.vendorId === currentUser.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Slot Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📅 {t('vendorBookings.crmTab.controls.slotLabel')}</label>
                <select
                  value={crmSlotId}
                  onChange={(e) => setCrmSlotId(e.target.value)}
                  disabled={!crmTourId}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs disabled:bg-slate-100 disabled:text-slate-400 font-mono font-bold font-sans"
                >
                  <option value="">{t('vendorBookings.crmTab.controls.allSlotsOption')}</option>
                  {slots.filter(s => s.tourId === crmTourId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.startDate} ({s.price} AZN) — {t('vendorBookings.crmTab.controls.slotBookedCount', { count: s.bookedCount })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCrmSlot && (
            /* Capacity & CRM Metrics widget */
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">{t('vendorBookings.crmTab.metrics.groupCapacity')}</span>
                  <strong className="text-base text-slate-800 font-mono">{selectedCrmSlot.capacity}</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">{t('vendorBookings.crmTab.metrics.platformBookings')}</span>
                  <strong className="text-base text-slate-800 font-mono">{t('vendorBookings.crmTab.metrics.peopleCount', { count: webBookingsCount })}</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">{t('vendorBookings.crmTab.metrics.externalSales')}</span>
                  <strong className="text-base text-slate-800 font-mono">{t('vendorBookings.crmTab.metrics.seatsCount', { count: selectedCrmTour?.externalSales || 0 })}</strong>
                </div>
              </div>

              <div className={`p-4 rounded-xl border shadow-xs flex items-center gap-3 transition ${
                remainingSeats <= 3
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
              }`}>
                <div className={`p-2.5 rounded-lg ${remainingSeats <= 3 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold tracking-wider opacity-75">{t('vendorBookings.crmTab.metrics.seatsRemaining')}</span>
                  <strong className="text-base font-mono">{t('vendorBookings.crmTab.metrics.seatsCount', { count: remainingSeats })}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Participant List Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-slate-200 text-slate-700 border border-slate-300 font-extrabold text-[10px] rounded-md font-mono font-bold">
                      {selectedCrmSlot ? t('vendorBookings.crmTab.table.badge.slot', { id: selectedCrmSlot.id.slice(5).toUpperCase() }) : (crmTourId ? t('vendorBookings.crmTab.table.badge.selectedTour') : t('vendorBookings.crmTab.table.badge.allOrders'))}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-sans">
                      {t('vendorBookings.crmTab.table.participantListSummary', { shown: filteredCrmBookingsForSlot.length, total: activeCrmBookingsForSlot.length })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end sm:self-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.selectTourFirstExport'), 'warning');
                          return;
                        }
                        if (!selectedCrmSlot) {
                          if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.selectSlotFirstExport'), 'warning');
                          return;
                        }
                        if (filteredCrmBookingsForSlot.length === 0) {
                          if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.noParticipantsToExport'), 'warning');
                          return;
                        }

                        const headers = t('vendorBookings.crmTab.csv.headers') + '\n';
                        const rows = filteredCrmBookingsForSlot.map((b, idx) => {
                          const name = b.customerName.replace(/"/g, '""');
                          const phone = b.customerPhone.replace(/"/g, '""');
                          const payStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');
                          const note = (b.operatorNote || '').replace(/"/g, '""');
                          const qty = b.participantsCount || 1;
                          const tUrl = b.ticketUrl ? `${window.location.origin}${b.ticketUrl}` : '';
                          return `${idx + 1},"${name}","${phone}","${payStatus}","${note}",${qty},"${tUrl}"`;
                        }).join('\n');

                        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
                        const link = document.createElement('a');
                        link.setAttribute('href', csvContent);
                        link.setAttribute('download', `manifest_${selectedCrmTour?.name || 'tur'}_${selectedCrmSlot?.startDate || 'tarix'}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        if (onShowNotification) {
                          onShowNotification(t('vendorBookings.crmTab.notifications.csvExported'), 'success');
                        }
                      }}
                      className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 font-extrabold text-[10px] rounded-lg transition border border-slate-250 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('vendorBookings.crmTab.buttons.exportCsv')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const confirmedBookings = filteredCrmBookingsForSlot.filter(
                          b => b.paymentStatus === 'Ödənilib' || b.status === 'paid'
                        );

                        if (confirmedBookings.length === 0) {
                          if (onShowNotification) {
                            onShowNotification(t('vendorBookings.crmTab.notifications.noConfirmedForWhatsapp'), 'warning');
                          }
                          return;
                        }

                        let text = `📋 *${t('vendorBookings.crmTab.whatsappManifest.title')}*\n`;
                        text += `🏔️ *${t('vendorBookings.crmTab.whatsappManifest.tourLabel')}:* ${selectedCrmTour?.name || ''}\n`;
                        text += `📅 *${t('vendorBookings.crmTab.whatsappManifest.dateLabel')}:* ${selectedCrmSlot?.startDate || ''}\n`;
                        text += `👥 *${t('vendorBookings.crmTab.whatsappManifest.participantCountLabel')}:* ${t('vendorBookings.crmTab.metrics.peopleCount', { count: confirmedBookings.reduce((sum, b) => sum + b.participantsCount, 0) })}\n\n`;

                        let count = 1;
                        confirmedBookings.forEach((b) => {
                          const noteText = b.operatorNote ? `_${b.operatorNote}_` : t('vendorBookings.crmTab.whatsappManifest.noNote');
                          text += `${count}. *${b.customerName}* (${t('vendorBookings.crmTab.whatsappManifest.ticketLabel')}: ${b.participantsCount})\n`;
                          text += `   📞 ${t('vendorBookings.crmTab.whatsappManifest.phoneLabel')}: ${b.customerPhone}\n`;
                          text += `   📝 ${t('vendorBookings.crmTab.whatsappManifest.noteLabel')}: ${noteText}\n\n`;
                          count++;
                        });

                        text += `*${t('vendorBookings.crmTab.whatsappManifest.generatedOn')}:* ${new Date().toLocaleDateString('az-AZ')} | gedekgorek.az CRM 🌲`;

                        navigator.clipboard.writeText(text).then(() => {
                          if (onShowNotification) {
                            onShowNotification(t('vendorBookings.crmTab.notifications.whatsappCopySuccess'), 'success');
                          }
                        }).catch(err => {
                          console.error('Kopyalama xətası:', err);
                          if (onShowNotification) {
                            onShowNotification(t('vendorBookings.crmTab.notifications.clipboardError'), 'error');
                          }
                        });
                      }}
                      className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border border-emerald-200 font-extrabold text-[10px] rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('vendorBookings.crmTab.buttons.copyForWhatsapp')}</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Live Filters & Add Participant Sidebar/Trigger Action (Requirement 3 & 4) */}
                <div className="p-4 bg-white border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider font-sans">{t('vendorBookings.crmTab.filters.paymentStatusLabel')}</span>
                      <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-707 text-slate-700 p-1.5 px-2 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                      >
                        <option value="Bütün">{t('vendorBookings.crmTab.filters.allOption')}</option>
                        <option value="Ödənilib">{t('vendorBookings.crmTab.filters.paidOption')}</option>
                        <option value="Ödənilməyib">{t('vendorBookings.crmTab.filters.unpaidOption')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2 text-xs font-sans select-none"
                    >
                      <span>📷 {t('vendorBookings.crmTab.buttons.checkWithQr')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.selectTourFirstAdd'), 'warning');
                          return;
                        }
                        if (!crmSlotId) {
                          if (onShowNotification) onShowNotification(t('vendorBookings.crmTab.notifications.selectSlotFirstAdd'), 'warning');
                          return;
                        }
                        setManualName('');
                        setManualPhone('');
                        setManualParticipantsCount(1);
                        setManualPaymentStatus('Ödənilməyib');
                        setManualOperatorNote('');
                        setIsAddParticipantOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2 text-xs font-sans select-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('vendorBookings.crmTab.buttons.addParticipant')}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto font-sans -webkit-overflow-scrolling-touch">
                  <table className="w-full min-w-[820px] text-left border-collapse text-xs">
                    <thead className="bg-ink-50 border-b border-slate-200 text-slate-400 font-bold tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-center w-12">{t('vendorBookings.crmTab.table.headers.order')}</th>
                        <th className="p-3">{t('vendorBookings.crmTab.table.headers.customer')}</th>
                        <th className="p-3">{t('vendorBookings.crmTab.table.headers.phone')}</th>
                        <th className="p-3">{t('vendorBookings.crmTab.table.headers.paymentStatus')}</th>
                        <th className="p-3">{t('vendorBookings.crmTab.table.headers.ticketAndDate')}</th>
                        <th className="p-3 w-64">{t('vendorBookings.crmTab.table.headers.operatorNote')}</th>
                        <th className="p-3 text-center">{t('vendorBookings.crmTab.table.headers.pdfTicket')}</th>
                        <th className="p-3 text-center">{t('vendorBookings.crmTab.table.headers.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750 text-slate-700">
                      {filteredCrmBookingsForSlot.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center italic text-slate-400 border-b-0 bg-slate-50/50">
                            {t('vendorBookings.crmTab.table.emptyState')}
                          </td>
                        </tr>
                      ) : (
                        filteredCrmBookingsForSlot.map((b, idx) => {
                          const currentPaymentStatus = b.paymentStatus || (b.status === 'paid' ? 'Ödənilib' : 'Ödənilməyib');

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-1.5 py-3 text-center font-mono font-bold text-slate-400 border-r border-slate-100/50">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  key={`${b.id}-name`}
                                  defaultValue={b.customerName}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== b.customerName) {
                                      onEditBooking({ ...b, customerName: e.target.value });
                                    }
                                  }}
                                  className="font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white text-xs p-1 rounded border border-transparent focus:border-slate-300 w-full focus:outline-none transition"
                                />
                                {/* Rezervasiya nömrəsi — biletdə çap olunur, müştəri rəy yazanda bununla təsdiqlənir */}
                                {b.booking_reference && (
                                  <span className="block text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mt-1 w-fit">
                                    {b.booking_reference}
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  key={`${b.id}-phone`}
                                  defaultValue={b.customerPhone}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== b.customerPhone) {
                                      onEditBooking({ ...b, customerPhone: e.target.value });
                                    }
                                  }}
                                  className="font-mono text-slate-600 bg-transparent hover:bg-slate-100 focus:bg-white text-[11px] p-1 rounded border border-transparent focus:border-slate-300 w-full focus:outline-none transition font-semibold"
                                />
                              </td>
                              <td className="p-1.5 py-3">
                                <select
                                  value={b.status === 'paid' ? 'paid' : (b.status === 'cancelled' ? 'cancelled' : 'pending')}
                                  onChange={async (e) => {
                                    const value = e.target.value as 'pending' | 'paid' | 'cancelled';
                                    if (!onEditBooking) return;

                                    const updated: Booking = {
                                      ...b,
                                      paymentStatus: value === 'paid' ? 'Ödənilib' : 'Ödənilməyib',
                                      status: value
                                    };
                                    try {
                                      await onEditBooking(updated);
                                      if (value === 'paid') {
                                        triggerTicketGeneration(updated, selectedCrmTour?.name || '', selectedCrmTour?.region || '', selectedCrmSlot?.startDate || '');
                                        if (onShowNotification) {
                                          onShowNotification(t('vendorBookings.crmTab.notifications.orderConfirmedTicketReady'), 'success');
                                        }
                                      } else if (value === 'cancelled') {
                                        if (onShowNotification) {
                                          onShowNotification(t('vendorBookings.crmTab.notifications.orderCancelledSeatReturned'), 'warning');
                                        }
                                      } else {
                                        if (onShowNotification) {
                                          onShowNotification(t('vendorBookings.crmTab.notifications.orderStatusSaved'), 'info');
                                        }
                                      }
                                    } catch {
                                      // handleEditBooking (App.tsx) already showed an error toast
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border text-[10px] font-black focus:outline-none focus:ring-1 transition cursor-pointer text-center ${
                                    b.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-250 focus:ring-emerald-700/55'
                                      : b.status === 'cancelled' ? 'bg-red-50 text-red-800 border-red-250 focus:ring-red-700/55' : 'bg-amber-50 text-amber-800 border-amber-250 focus:ring-amber-700/55'
                                  }`}
                                >
                                  <option value="paid">{t('vendorBookings.crmTab.statusSelect.confirmedPaid')}</option>
                                  <option value="pending">{t('vendorBookings.crmTab.statusSelect.pendingWhatsapp')}</option>
                                  <option value="cancelled">{t('vendorBookings.crmTab.statusSelect.cancelled')}</option>
                                </select>
                              </td>
                              <td className="p-1.5 py-3">
                                <span className="font-bold flex items-center gap-1 text-[11px] text-slate-800 font-mono">
                                  🎟️ {t('vendorBookings.crmTab.metrics.peopleCount', { count: b.participantsCount })}
                                </span>
                                <span className="block text-[9px] text-slate-400 font-medium font-mono">
                                  {b.bookingDate}
                                </span>
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  placeholder={t('vendorBookings.crmTab.table.notePlaceholder')}
                                  key={`${b.id}-note`}
                                  defaultValue={b.operatorNote || ''}
                                  onBlur={(e) => {
                                    if (onEditBooking && e.target.value !== (b.operatorNote || '')) {
                                      onEditBooking({ ...b, operatorNote: e.target.value });
                                    }
                                  }}
                                  className="w-full text-slate-705 text-slate-700 placeholder-slate-400 bg-transparent hover:bg-slate-100 focus:bg-white text-[11px] p-1.5 rounded border border-transparent focus:border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-250/20 transition font-medium"
                                />
                              </td>
                              <td className="p-1.5 py-3 text-center">
                                {b.ticketUrl && b.status === 'paid' ? (
                                  <a
                                    href={b.ticketUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-705 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded font-black text-[10px] transition cursor-pointer select-none"
                                    title={t('vendorBookings.crmTab.table.clickToDownload')}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{t('vendorBookings.crmTab.buttons.download')}</span>
                                  </a>
                                ) : b.status === 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerTicketGeneration(b, selectedCrmTour?.name || '', selectedCrmTour?.region || '', selectedCrmSlot?.startDate || '');
                                      if (onShowNotification) {
                                        onShowNotification(t('vendorBookings.crmTab.notifications.ticketGenerationStarted'), 'info');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 hover:border-slate-350 rounded font-bold text-[10px] transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>{t('vendorBookings.crmTab.buttons.setupTicket')}</span>
                                  </button>
                                ) : b.status === 'cancelled' ? (
                                  <span className="text-[10px] text-red-500 font-bold">{t('vendorBookings.crmTab.table.cancelledBadge')}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">{t('vendorBookings.crmTab.table.pendingEllipsis')}</span>
                                )}
                              </td>
                              <td className="p-1.5 py-3 text-center">
                                <button
                                  type="button"
                                  disabled={deletingBookingId === b.id}
                                  onClick={() => handleDeleteBooking(b)}
                                  title={t('vendorBookings.crmTab.buttons.delete')}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 rounded font-bold text-[10px] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{deletingBookingId === b.id ? t('vendorBookings.crmTab.buttons.deleting') : t('vendorBookings.crmTab.buttons.delete')}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual Participant Insertion Modal Dialog (Requirement 3) */}
              {isAddParticipantOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
                  <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-100 shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto animate-scaleIn font-sans">
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
                      <h4 className="text-xs font-extrabold tracking-widest flex items-center gap-2">
                        🎟️ {t('vendorBookings.crmTab.addModal.title')}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddParticipantOpen(false)}
                        className="p-2 -mr-2 text-slate-400 hover:text-white transition cursor-pointer rounded-lg active:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!manualName || !manualPhone) {
                          if (onShowNotification) {
                            onShowNotification(t('vendorBookings.crmTab.addModal.fillNameAndPhone'), 'warning');
                          }
                          return;
                        }

                        const numParticipants = Number(manualParticipantsCount) || 1;
                        const finalAmount = numParticipants * (selectedCrmSlot?.price || 25);
                        const finalPaymentStatus = manualPaymentStatus;
                        const finalAttendanceStatus = finalPaymentStatus === 'Ödənilib' ? 'Təsdiqlənib' : 'Gözləmədə';

                        const newBooking: Booking = {
                          id: `manual-${Date.now()}`,
                          slotId: crmSlotId,
                          tourId: crmTourId,
                          customerId: `manual-customer-${Date.now()}`,
                          customerName: manualName,
                          customerPhone: manualPhone,
                          bookingDate: selectedCrmSlot?.startDate || new Date().toISOString().split('T')[0],
                          participantsCount: numParticipants,
                          totalAmount: finalAmount,
                          status: finalPaymentStatus === 'Ödənilib' ? 'paid' : 'pending',
                          paymentStatus: finalPaymentStatus,
                          attendanceStatus: finalAttendanceStatus,
                          operatorNote: manualOperatorNote,
                          smsNotificationSent: false,
                          paymentMethod: 'Nağd / Kənar CRM'
                        };

                        setIsSubmittingManualBooking(true);
                        setManualBookingError(null);
                        try {
                          // onAddBooking POSTs to /api/bookings and already syncs the
                          // slot's bookedCount from the server's response, so there's no
                          // separate increment call here.
                          if (onAddBooking) {
                            await onAddBooking(newBooking);
                          }

                          setIsAddParticipantOpen(false);

                          if (onShowNotification) {
                            onShowNotification(t('vendorBookings.crmTab.notifications.manualParticipantAdded'), 'success');
                          }

                          if (finalPaymentStatus === 'Ödənilib') {
                            await triggerTicketGeneration(
                              newBooking,
                              selectedCrmTour?.name || '',
                              selectedCrmTour?.region || '',
                              selectedCrmSlot?.startDate || ''
                            );
                          }
                        } catch (err: any) {
                          setManualBookingError(err?.message || t('vendorBookings.crmTab.addModal.addParticipantError'));
                        } finally {
                          setIsSubmittingManualBooking(false);
                        }
                      }}
                      className="p-6 text-left flex flex-col gap-4"
                    >
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <div className="font-bold text-slate-900 mb-1">{t('vendorBookings.crmTab.addModal.selectedRouteAndDate')}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-semibold text-emerald-800">{selectedCrmTour?.name}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded">{selectedCrmSlot?.startDate}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">{t('vendorBookings.crmTab.addModal.nameLabel')}</label>
                        <input
                          type="text"
                          required
                          placeholder={t('vendorBookings.crmTab.addModal.namePlaceholder')}
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700">{t('vendorBookings.crmTab.addModal.phoneLabel')}</label>
                        <input
                          type="tel"
                          required
                          placeholder={t('vendorBookings.crmTab.addModal.phonePlaceholder')}
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">{t('vendorBookings.crmTab.addModal.participantCountLabel')}</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder={t('vendorBookings.crmTab.addModal.participantCountPlaceholder')}
                          value={manualParticipantsCount}
                          onChange={(e) => { const raw = e.target.value; setManualParticipantsCount(raw === '' ? '' : Math.max(1, Number(raw))); }}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700 font-sans">{t('vendorBookings.crmTab.addModal.paymentStatusLabel')}</label>
                        <select
                          value={manualPaymentStatus}
                          onChange={(e) => {
                            const val = e.target.value as 'Ödənilib' | 'Ödənilməyib';
                            setManualPaymentStatus(val);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                        >
                          <option value="Ödənilməyib">{t('vendorBookings.crmTab.filters.unpaidOption')}</option>
                          <option value="Ödənilib">{t('vendorBookings.crmTab.filters.paidOption')}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">{t('vendorBookings.crmTab.addModal.operatorNoteLabel')}</label>
                        <textarea
                          placeholder={t('vendorBookings.crmTab.addModal.operatorNotePlaceholder')}
                          value={manualOperatorNote}
                          onChange={(e) => setManualOperatorNote(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-medium resize-none transition"
                        />
                      </div>

                      {manualBookingError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                          ⚠️ {manualBookingError}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                        <button
                          type="button"
                          onClick={() => setIsAddParticipantOpen(false)}
                          className="w-1/2 p-3 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          {t('vendorBookings.crmTab.addModal.cancelButton')}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingManualBooking}
                          className="w-1/2 p-3 sm:p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingManualBooking ? t('vendorBookings.crmTab.addModal.saving') : t('vendorBookings.crmTab.addModal.saveButton')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <QrScannerModal
                 isOpen={isQrScannerOpen}
                 onClose={() => setIsQrScannerOpen(false)}
                 onScan={handleQrScan}
              />

          {crmTourId && slots.filter(s => s.tourId === crmTourId).length === 0 && (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-400 italic text-xs">
              {t('vendorBookings.crmTab.noActiveCalendar')}
            </div>
          )}
        </div>
  );
}