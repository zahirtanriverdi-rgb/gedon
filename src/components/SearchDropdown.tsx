import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Tour } from '../types';

interface SearchDropdownProps {
  query: string;
  tours: Tour[];
  recentSearches: string[];
  onSelect: (value: string) => void;
  appLanguage?: 'az' | 'en' | 'ru';
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({ 
  query, 
  tours, 
  recentSearches, 
  onSelect,
  appLanguage = 'az' 
}) => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Determine if we should show recent searches
  const showRecent = !lowerQuery && recentSearches.length > 0;
  
  // Get dynamic suggestions
  const suggestions: Array<{ title: string, subtitle: string, type: 'region' | 'tour', image?: string, id?: string }> = [];
  
  if (lowerQuery) {
    // 1. Find matching regions
    const matchedRegions = Array.from(new Set(tours.filter(t => t.region.toLowerCase().includes(lowerQuery)).map(t => t.region)));
    
    matchedRegions.slice(0, 3).forEach(region => {
       const count = tours.filter(t => t.region === region).length;
       suggestions.push({
         title: region,
         subtitle: `${count} ${appLanguage === 'az' ? 'aktivite' : appLanguage === 'ru' ? 'активностей' : 'activities'} • ${appLanguage === 'az' ? 'Region' : appLanguage === 'ru' ? 'Регион' : 'Region'}`,
         type: 'region'
       });
    });

    // 2. Find matching tours
    const matchedTours = tours.filter(t => t.name.toLowerCase().includes(lowerQuery) || t.description.toLowerCase().includes(lowerQuery));
    
    matchedTours.slice(0, 4).forEach(tour => {
       suggestions.push({
         title: tour.name,
         subtitle: tour.region,
         type: 'tour',
         image: tour.image,
         id: tour.id
       });
    });
  } else {
    // Default popular suggestions if no query
    const popularRegions = ['Quba', 'Qəbələ', 'Şahdağ', 'Tufandağ'];
    popularRegions.forEach(region => {
      const count = tours.filter(t => t.region === region || t.name.includes(region)).length;
      if (count > 0 || region === 'Şahdağ' || region === 'Tufandağ') {
        suggestions.push({
          title: region,
          subtitle: `${count || '10+'} ${appLanguage === 'az' ? 'aktivite' : appLanguage === 'ru' ? 'активностей' : 'activities'} • ${appLanguage === 'az' ? 'Populyar' : appLanguage === 'ru' ? 'Популярное' : 'Popular'}`,
          type: 'region'
        });
      }
    });
  }

  if (suggestions.length === 0 && !showRecent) {
    return (
      <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-4 text-left">
        <div className="px-4 text-center text-slate-500 py-4 text-sm font-medium">
          {appLanguage === 'az' ? 'Nəticə tapılmadı' : appLanguage === 'ru' ? 'Ничего не найдено' : 'No results found'}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-4 text-left max-h-[70vh] overflow-y-auto">
      {/* Recent Searches */}
      {showRecent && (
        <div className="px-4 mb-5">
          <h3 className="text-[14px] font-bold text-slate-500 mb-3">
            {appLanguage === 'az' ? 'Son Axtarışlar' : appLanguage === 'ru' ? 'Недавние поиски' : 'Recent Searches'}
          </h3>
          <div className="flex flex-col gap-1">
            {recentSearches.map((search, idx) => (
              <button 
                key={idx}
                onClick={() => onSelect(search)}
                className="flex items-center gap-4 w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">{search}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4">
          <h3 className="text-[14px] font-bold text-slate-500 mb-3">
            {appLanguage === 'az' ? 'Təkliflər' : appLanguage === 'ru' ? 'Предложения' : 'Suggestions'}
          </h3>
          <div className="flex flex-col gap-1">
            {suggestions.map((sugg, idx) => (
              <button 
                key={idx}
                onClick={() => onSelect(sugg.title)}
                className="flex items-center gap-4 w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {sugg.type === 'region' ? (
                    <MapPin className="w-6 h-6 text-slate-400" />
                  ) : sugg.image ? (
                    <img src={sugg.image} alt={sugg.title} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-slate-800 text-[15px] truncate">{sugg.title}</span>
                  <span className="text-[13px] text-slate-500 font-medium mt-0.5 truncate">{sugg.subtitle}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
