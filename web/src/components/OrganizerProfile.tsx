'use client';
import React from 'react';
import { User, Tour } from '../types';
import { MapPin, Star, Calendar, MessageSquare, Phone, ExternalLink } from 'lucide-react';
import { REVIEWS_ENABLED } from '../config/features';
import { useLanguage } from '../i18n/LanguageContext';
import { getLocalizedTourName, getLocalizedUserAbout, getLocalizedGuideBio, getLocalizedGuideSpecialty } from '../i18n/tourLocalization';

interface OrganizerProfileProps {
  organizer: User;
  tours: Tour[];
  onBack: () => void;
  onTourClick: (tour: Tour) => void;
}

export default function OrganizerProfile({ organizer, tours, onBack, onTourClick }: OrganizerProfileProps) {
  const { t, language } = useLanguage();
  // Belt-and-suspenders alongside the server-side filter (GET /api/tours only returns
  // status = 'approved' to anonymous/customer requests) — a pending or rejected tour must
  // never show up on a vendor's public profile.
  const activeTours = tours.filter(tour => tour.vendorId === organizer.id && tour.status === 'approved');

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 animate-fadeIn font-sans">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-emerald-600 font-bold hover:text-emerald-700 transition"
      >
        <span className="mr-2">←</span> {t('customerMisc.organizerProfile.backButton')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Organizer Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-emerald-50">
              {organizer.avatar ? (
                <img src={organizer.avatar} alt={organizer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-400">
                  {organizer.companyName ? organizer.companyName.charAt(0) : organizer.name.charAt(0)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
              {organizer.companyName || organizer.name}
            </h1>
            <p className="text-teal-600 font-bold text-sm mb-4">{t('customerMisc.organizerProfile.officialOrganizer')}</p>
            
            <div className="flex flex-col gap-2 mt-6">
              {organizer.phone && (
                <a href={'tel:' + organizer.phone} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition">
                  <Phone className="w-4 h-4" />
                  {organizer.phone}
                </a>
              )}
              {organizer.whatsapp_number && (
                <a href={'https://wa.me/' + organizer.whatsapp_number.split('+').join('').split(' ').join('')} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition">
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-extrabold text-slate-800 mb-3">{t('customerMisc.organizerProfile.about')}</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              {getLocalizedUserAbout(organizer, language) || t('customerMisc.organizerProfile.noAboutInfo')}
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Guides / Team section */}
          {organizer.guides && organizer.guides.length > 0 && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4">{t('customerMisc.organizerProfile.ourTeamGuides')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organizer.guides.map((guide, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className="w-14 h-14 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {guide.avatar ? (
                        <img src={guide.avatar} alt={guide.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-slate-500">{guide.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800">{guide.name}</h4>
                      {guide.specialty && (
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded mt-1 mb-2 uppercase tracking-wide">
                          {getLocalizedGuideSpecialty(guide, language)}
                        </span>
                      )}
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{getLocalizedGuideBio(guide, language)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Tours */}
          <div>
            <h2 className="text-2xl font-extrabold text-label-primary mb-6">{t('customerMisc.organizerProfile.organizerTours')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTours.length > 0 ? (
                activeTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="group bg-white rounded-2xl border border-[#E4E6E9] overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer transition-all"
                    onClick={() => onTourClick(tour)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {tour.image && (
                        <img src={tour.image} alt={getLocalizedTourName(tour, language)} className="w-full h-full object-cover group-hover:scale-102 transition duration-500" />
                      )}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 px-2 py-1 text-xs font-bold rounded">
                        {tour.durationDays} {t('customerMisc.organizerProfile.durationDaysSuffix')}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{tour.category}</span>
                        {REVIEWS_ENABLED && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold text-label-primary">{tour.rating}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-[16px] font-bold leading-[1.4] text-label-primary">{getLocalizedTourName(tour, language)}</h3>
                      <div className="flex items-center text-label-secondary text-[14px] font-normal gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {tour.region}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-medium">{t('customerMisc.organizerProfile.noActiveTours')}</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}