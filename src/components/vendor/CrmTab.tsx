import React, { useState, useEffect } from 'react';
import { Tour, TourSlot, Booking, User } from '../../types';
import { QrScannerModal } from './QrScannerModal';
import { Calendar, CheckCircle, Copy, Download, FileText, Plus, Printer, Send, Users, X } from 'lucide-react';

interface CrmTabProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  currentUser: User;
  operatorToken: string | null;
  onEditBooking?: (updatedBooking: Booking) => Promise<void>;
  onAddBooking?: (newBooking: Booking) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  triggerTicketGeneration: (booking: Booking, tourName?: string, region?: string, date?: string) => Promise<string | undefined>;
}

export function CrmTab({ tours, slots, bookings, currentUser, operatorToken, onEditBooking, onAddBooking, onShowNotification, triggerTicketGeneration }: CrmTabProps) {
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
      if (onShowNotification) onShowNotification('Sessiyanız bitib. Yenidən daxil olun.', 'error');
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
        if (onShowNotification) {
          onShowNotification(data.error || 'Sistemdə bu bilet məlumatı tapılmadı! Xahiş edirik QR kodu bir daha yoxlayın. ❌', 'error');
        }
        return;
      }

      if (data.alreadyCheckedIn) {
        if (onShowNotification) onShowNotification('Bu bilet artıq check-in edilib! ⚠️', 'warning');
        return;
      }

      if (onEditBooking) {
        await onEditBooking(data.booking);
      }
      if (onShowNotification) {
        onShowNotification(`Check-in uğurludur: ${data.booking.customerName} (${data.booking.participantsCount} nəfər) ✅`, 'success');
      }
    } catch (err) {
      console.error('Check-in zamanı xəta baş verdi:', err);
      if (onShowNotification) onShowNotification('Sistem xətası: Check-in edilə bilmədi.', 'error');
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
                  📊 İŞTİRAKÇI SİYAHISI VƏ CRM PANELİ
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müştəri rezervasiyalarını izləyin, iştirak/ödəniş statuslarını idarə edin.
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Məlumatlar real-time olaraq avtomatik yadda saxlanılır</span>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Tour Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📌 Tur Seçin:</label>
                <select
                  value={crmTourId}
                  onChange={(e) => {
                    setCrmTourId(e.target.value);
                    setCrmSlotId('');
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs font-bold"
                >
                  <option value="">-- Bütün Turlar (Son Rezervasiyalar) --</option>
                  {tours.filter(t => t.vendorId === currentUser.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Slot Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">📅 Tarix / Slot Seçin:</label>
                <select
                  value={crmSlotId}
                  onChange={(e) => setCrmSlotId(e.target.value)}
                  disabled={!crmTourId}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/50 transition shadow-xs disabled:bg-slate-100 disabled:text-slate-400 font-mono font-bold font-sans"
                >
                  <option value="">-- Bütün Tarixlər (Bütün Sifarişlər) --</option>
                  {slots.filter(s => s.tourId === crmTourId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.startDate} ({s.price} AZN) — {s.bookedCount} nəfər qeydiyyatda
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
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Qrup Limiti (Yer)</span>
                  <strong className="text-base text-slate-800 font-mono">{selectedCrmSlot.capacity}</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Platforma Rezervasiyaları</span>
                  <strong className="text-base text-slate-800 font-mono">{webBookingsCount} nəfər</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold tracking-wider">Kənar Satışlar (WP/İG)</span>
                  <strong className="text-base text-slate-800 font-mono">{selectedCrmTour?.externalSales || 0} yer</strong>
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
                  <span className="block text-[10px] font-bold tracking-wider opacity-75">Boş Qalan Son Yerlər</span>
                  <strong className="text-base font-mono">{remainingSeats} yer</strong>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Participant List Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-slate-200 text-slate-700 border border-slate-300 font-extrabold text-[10px] rounded-md font-mono font-bold">
                      {selectedCrmSlot ? `SLOT #${selectedCrmSlot.id.slice(5).toUpperCase()}` : (crmTourId ? "SEÇİLMİŞ TUR" : "BÜTÜN SİFARİŞLƏR")}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-sans">
                      İştirakçı siyahısı (Gösterilən: {filteredCrmBookingsForSlot.length} bilet qrupu, Ümumi: {activeCrmBookingsForSlot.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-end self-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification('Siyahını yükləmək üçün əvvəlcə bir Tur seçin.', 'warning');
                          return;
                        }
                        if (!selectedCrmSlot) {
                          if (onShowNotification) onShowNotification('Siyahını yükləmək üçün zəhmət olmasa yuxarıdan bir Tarix/Slot seçin.', 'warning');
                          return;
                        }
                        if (filteredCrmBookingsForSlot.length === 0) {
                          if (onShowNotification) onShowNotification('Bu slot üçün ixrac ediləcək iştirakçı tapılmadı.', 'warning');
                          return;
                        }

                        const headers = 'Sıra,Ad Soyad,Telefon,Ödəniş Statusu,Operator Qeydi,Bilet Sayı,Bilet Linki\n';
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
                          onShowNotification('İştirakçı siyahısı CSV formatında yükləndi! 📥', 'success');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 font-extrabold text-[10px] rounded-lg transition border border-slate-250 cursor-pointer flex items-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Eksport (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const confirmedBookings = filteredCrmBookingsForSlot.filter(
                          b => b.paymentStatus === 'Ödənilib' || b.status === 'paid'
                        );

                        if (confirmedBookings.length === 0) {
                          if (onShowNotification) {
                            onShowNotification('WhatsApp üçün fəal/görünən ödənişli iştirakçı siyahısı tapılmadı.', 'warning');
                          }
                          return;
                        }

                        let text = `📋 *TUR İŞTİRAKÇI MANİFESTİ (ÖDƏNİŞLİ)*\n`;
                        text += `🏔️ *Tur:* ${selectedCrmTour?.name || ''}\n`;
                        text += `📅 *Tarix:* ${selectedCrmSlot?.startDate || ''}\n`;
                        text += `👥 *İştirakçı sayı:* ${confirmedBookings.reduce((sum, b) => sum + b.participantsCount, 0)} nəfər\n\n`;

                        let count = 1;
                        confirmedBookings.forEach((b) => {
                          const noteText = b.operatorNote ? `_${b.operatorNote}_` : 'Yoxdur';
                          text += `${count}. *${b.customerName}* (Bilet: ${b.participantsCount})\n`;
                          text += `   📞 Telefon: ${b.customerPhone}\n`;
                          text += `   📝 Qeyd: ${noteText}\n\n`;
                          count++;
                        });

                        text += `*Tərtib edildi:* ${new Date().toLocaleDateString('az-AZ')} | gedekgorek.az CRM 🌲`;

                        navigator.clipboard.writeText(text).then(() => {
                          if (onShowNotification) {
                            onShowNotification('Təsdiqlənmiş iştirakçı siyahısı WhatsApp üçün kopyalandı! 📋📲', 'success');
                          }
                        }).catch(err => {
                          console.error('Kopyalama xətası:', err);
                          if (onShowNotification) {
                            onShowNotification('Panoya kopyalamaq alınmadı.', 'error');
                          }
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border border-emerald-200 font-extrabold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs font-sans font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>WhatsApp üçün kopyala</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Live Filters & Add Participant Sidebar/Trigger Action (Requirement 3 & 4) */}
                <div className="p-4 bg-white border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wider font-sans">Ödəniş Statusu:</span>
                      <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-707 text-slate-700 p-1.5 px-2 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                      >
                        <option value="Bütün">Bütün (Hamısı)</option>
                        <option value="Ödənilib">Ödənilib</option>
                        <option value="Ödənilməyib">Ödənilməyib</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsQrScannerOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center gap-2 text-xs font-sans select-none"
                    >
                      <span>📷 QR İlə Yoxla</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!crmTourId) {
                          if (onShowNotification) onShowNotification('Yeni iştirakçı əlavə etmək üçün əvvəlcə bir Tur seçin.', 'warning');
                          return;
                        }
                        if (!crmSlotId) {
                          if (onShowNotification) onShowNotification('Yeni iştirakçı əlavə etmək üçün zəhmət olmasa yuxarıdan bir Tarix/Slot seçin.', 'warning');
                          return;
                        }
                        setManualName('');
                        setManualPhone('');
                        setManualParticipantsCount(1);
                        setManualPaymentStatus('Ödənilməyib');
                        setManualOperatorNote('');
                        setIsAddParticipantOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition duration-150 cursor-pointer flex items-center gap-2 text-xs font-sans select-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni İştirakçı Əlavə Et</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto font-sans">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-ink-50 border-b border-slate-200 text-slate-400 font-bold tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-center w-12">Sıra</th>
                        <th className="p-3">Adı və Soyadı</th>
                        <th className="p-3">Mobil Telefon</th>
                        <th className="p-3">Ödəniş Statusu</th>
                        <th className="p-3">Bilet & Tarix</th>
                        <th className="p-3 w-64">Operator Qeydi</th>
                        <th className="p-3 text-center">PDF Bilet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750 text-slate-700">
                      {filteredCrmBookingsForSlot.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center italic text-slate-400 border-b-0 bg-slate-50/50">
                            Axtarış filtrinə və tənzimləmələrə uyğun heç bir bilet qrafiki tapılmadı.
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
                                          onShowNotification('Sifariş təsdiqləndi. PDF bilet tənzimləndi! 🎫', 'success');
                                        }
                                      } else if (value === 'cancelled') {
                                        if (onShowNotification) {
                                          onShowNotification(`Sifariş ləğv edildi və boş yer geri qaytarıldı.`, 'warning');
                                        }
                                      } else {
                                        if (onShowNotification) {
                                          onShowNotification(`Sifariş statusu qeydə alındı.`, 'info');
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
                                  <option value="paid">Təsdiqləndi (Ödənilib)</option>
                                  <option value="pending">Gözləyir (WhatsApp)</option>
                                  <option value="cancelled">Ləğv Edildi</option>
                                </select>
                              </td>
                              <td className="p-1.5 py-3">
                                <span className="font-bold flex items-center gap-1 text-[11px] text-slate-800 font-mono">
                                  🎟️ {b.participantsCount} nəfər
                                </span>
                                <span className="block text-[9px] text-slate-400 font-medium font-mono">
                                  {b.bookingDate}
                                </span>
                              </td>
                              <td className="p-1.5 py-3">
                                <input
                                  type="text"
                                  placeholder="Məs: Sumqayıtdan minəcək..."
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
                                    title="Klikləyin və yükləyin"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Yüklə</span>
                                  </a>
                                ) : b.status === 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerTicketGeneration(b, selectedCrmTour?.name || '', selectedCrmTour?.region || '', selectedCrmSlot?.startDate || '');
                                      if (onShowNotification) {
                                        onShowNotification('Sistem bilet yaradılması sorğusunu arxa planda başlatdı... 🎫', 'info');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 hover:border-slate-350 rounded font-bold text-[10px] transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Bilet Quraşdır</span>
                                  </button>
                                ) : b.status === 'cancelled' ? (
                                  <span className="text-[10px] text-red-500 font-bold">LƏĞV EDİLİB</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Gözləmədə...</span>
                                )}
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
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-hidden animate-scaleIn font-sans">
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <h4 className="text-xs font-extrabold tracking-widest flex items-center gap-2">
                        🎟️ İştirakçı Əlavə Et (Kənar Satış)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddParticipantOpen(false)}
                        className="p-1 text-slate-400 hover:text-white transition cursor-pointer mb-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!manualName || !manualPhone) {
                          if (onShowNotification) {
                            onShowNotification('Zəhmət olmasa Ad Soyad və Telefon sahələrini doldurun.', 'warning');
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
                            onShowNotification('Kənar iştirakçı uğurla qeydiyyata alındı və yer limiti azaldıldı! 🌲✨', 'success');
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
                          setManualBookingError(err?.message || 'İştirakçı əlavə edilərkən xəta baş verdi. Yenidən cəhd edin.');
                        } finally {
                          setIsSubmittingManualBooking(false);
                        }
                      }}
                      className="p-6 text-left flex flex-col gap-4"
                    >
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <div className="font-bold text-slate-900 mb-1">Seçilmiş Marşrut və Tarix:</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-semibold text-emerald-800">{selectedCrmTour?.name}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded">{selectedCrmSlot?.startDate}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Adı və Soyadı *</label>
                        <input
                          type="text"
                          required
                          placeholder="Məs: Əli Məmmədov"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700">Mobil Telefon Nömrəsi *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Məs: +994 50 123 45 67"
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">İştirakçı Sayı (Bilet) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Yer sayı"
                          value={manualParticipantsCount}
                          onChange={(e) => { const raw = e.target.value; setManualParticipantsCount(raw === '' ? '' : Math.max(1, Number(raw))); }}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-705 text-slate-700 font-sans">Ödəniş Statusu</label>
                        <select
                          value={manualPaymentStatus}
                          onChange={(e) => {
                            const val = e.target.value as 'Ödənilib' | 'Ödənilməyib';
                            setManualPaymentStatus(val);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:outline-none focus:border-emerald-600 transition cursor-pointer font-bold"
                        >
                          <option value="Ödənilməyib">Ödənilməyib</option>
                          <option value="Ödənilib">Ödənilib</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Operator Qeydi (İstəyə uyğun)</label>
                        <textarea
                          placeholder="Məs: Sumqayıtdan minəcək, vegetarian menyu..."
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

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddParticipantOpen(false)}
                          className="w-1/2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          İmtina Et
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingManualBooking}
                          className="w-1/2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingManualBooking ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
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
              Bu tur üçün heç bir fəal təqvim tapılmadı. Zəhmət olmasa digər tur seçin və ya yeni təqvim yaradın.
            </div>
          )}
        </div>
  );
}
