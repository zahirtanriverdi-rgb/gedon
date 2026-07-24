'use client';
import { useState } from 'react';
import { MapPin, Phone, Mail, Download, ChevronDown, ShieldCheck, Loader2 } from 'lucide-react';
import type { TicketContext } from './page';

// GYG-in "Standard mobile voucher" strukturunun Gotabiat brendinə (yaşıl palitra) uyğunlaşdırılmış
// versiyası. Bu, PDF-in kiçildilmiş görünüşü DEYİL — telefon ekranı üçün düşünülmüş öz kompozisiyasıdır,
// PDF isə aşağıdakı "PDF olaraq yüklə" düyməsi ilə ayrıca, tam sənəd-formatlı faylı endirir.
export function TicketPageClient({ data, reference }: { data: TicketContext; reference: string }) {
  const { booking, tour, vendor } = data;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isConfirmed = booking.status !== 'cancelled';
  const qrValue = `GOTABIAT|${booking.reference}|${booking.customerName}|${tour?.name || ''}`;
  const hasCoords = typeof tour?.meetingPointLat === 'number' && typeof tour?.meetingPointLng === 'number';
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${tour!.meetingPointLat},${tour!.meetingPointLng}`
    : null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/bookings/generate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          tourName: tour?.name || '',
          region: tour?.region || '',
          date: booking.travelDate || '',
          reference: booking.reference,
          participantsCount: booking.participantsCount,
          amount: booking.totalAmount,
          status: booking.status,
          meetingPoint: tour?.meetingPoint || '',
          vendorName: vendor?.companyName || '',
        }),
      });
      const json = await res.json();
      if (json?.ticketUrl) {
        window.open(json.ticketUrl, '_blank');
      }
    } catch (err) {
      console.error('[Ticket] PDF endirilə bilmədi:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:py-10">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        {/* Brend zolağı */}
        <div className="bg-emerald-700 px-5 py-4 flex items-center justify-between">
          <span className="text-white font-extrabold text-sm tracking-wide">GoTabiat.com</span>
          <span className="text-emerald-100 text-[10px] font-semibold">Elektron Bilet</span>
        </div>

        {/* Status banner */}
        <div className={`px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 ${isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {isConfirmed ? 'Təsdiqlənib və ödənilib' : 'Ləğv edilib'}
        </div>

        {/* Tur başlığı */}
        <div className="px-5 pt-4 pb-2">
          <h1 className="text-lg font-black text-slate-900 leading-tight">{tour?.name || 'Tur'}</h1>
          {tour?.region && <p className="text-xs text-slate-500 font-medium mt-0.5">{tour.region}</p>}
        </div>

        {/* Tarix / Sifariş nömrəsi */}
        <div className="px-5 grid grid-cols-2 gap-3 mb-3">
          <div>
            <span className="block text-[9px] font-extrabold tracking-wider text-slate-400">TARİX</span>
            <strong className="text-slate-900 text-sm">{booking.travelDate || '—'}</strong>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold tracking-wider text-slate-400">SİFARİŞ #</span>
            <strong className="text-slate-900 text-sm font-mono">{reference}</strong>
          </div>
        </div>

        {/* QR + iştirakçı */}
        <div className="px-5 flex items-center gap-4 pb-4 border-b border-dashed border-slate-200">
          <div className="bg-white p-1.5 rounded-lg border border-slate-200 shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrValue)}`}
              alt="Bilet QR kodu"
              className="w-[72px] h-[72px] block"
            />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p><span className="font-bold text-slate-900">{booking.customerName}</span></p>
            <p>{booking.participantsCount} nəfər</p>
            <p className="text-emerald-700 font-bold">{booking.totalAmount} AZN</p>
          </div>
        </div>

        {/* Bron detallarına bax */}
        <button
          onClick={() => setDetailsOpen(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-emerald-700 border-b border-slate-100"
        >
          Bron detallarına bax
          <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {detailsOpen && (
          <div className="px-5 py-3 bg-slate-50 text-xs text-slate-600 space-y-1.5 border-b border-slate-100">
            <p><span className="text-slate-400">Telefon:</span> {booking.customerPhone}</p>
            <p><span className="text-slate-400">İştirakçı sayı:</span> {booking.participantsCount} nəfər</p>
            <p><span className="text-slate-400">Ümumi məbləğ:</span> {booking.totalAmount} AZN</p>
            <p><span className="text-slate-400">Status:</span> {isConfirmed ? 'Təsdiqlənib' : 'Ləğv edilib'}</p>
          </div>
        )}

        {/* Görüş nöqtəsini tap */}
        <div className="border-b border-slate-100">
          <div className="px-5 py-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            Görüş nöqtəsini tap
          </div>
          {tour?.meetingPoint && (
            <p className="px-5 pb-2 text-xs text-slate-600">{tour.meetingPoint}</p>
          )}
          {tour?.meetingPointEmbedUrl ? (
            <div className="px-5 pb-4">
              <iframe
                src={tour.meetingPointEmbedUrl}
                className="w-full h-44 rounded-lg border border-slate-200"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : mapsUrl ? (
            <div className="px-5 pb-4">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 underline"
              >
                Xəritədə aç →
              </a>
            </div>
          ) : (
            <p className="px-5 pb-4 text-xs text-slate-400">Görüş yeri bələdçi ilə razılaşdırılacaq.</p>
          )}
        </div>

        {/* Vacib məlumat */}
        <button
          onClick={() => setRulesOpen(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-slate-900 border-b border-slate-100"
        >
          Vacib məlumat
          <ChevronDown className={`w-4 h-4 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
        </button>
        {rulesOpen && (
          <ul className="px-5 py-3 bg-slate-50 text-xs text-slate-600 space-y-1.5 list-disc list-inside border-b border-slate-100">
            <li>Bələdçinin təlimatlarına əməl edin</li>
            <li>Rahat yürüş ayaqqabısı və su mütləqdir</li>
            <li>Təbiəti qoruyun, zibil atmayın</li>
            <li>Xroniki xəstəlik barədə əvvəlcədən xəbərdar edin</li>
          </ul>
        )}

        {/* Yerli tərəfdaş məlumatı */}
        {vendor && (
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="block text-[9px] font-extrabold tracking-wider text-slate-400 mb-1.5">YERLİ TƏRƏFDAŞ MƏLUMATI</span>
            <p className="text-sm font-bold text-slate-900 mb-1">{vendor.companyName || 'GoTabiat.com'}</p>
            <div className="flex flex-col gap-1 text-xs">
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Phone className="w-3.5 h-3.5" /> {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="inline-flex items-center gap-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5" /> {vendor.email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* PDF olaraq yüklə */}
        <div className="p-5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF olaraq yüklə
          </button>
        </div>
      </div>
    </div>
  );
}
