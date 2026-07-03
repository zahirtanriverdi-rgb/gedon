import { Tour, TourSlot, User } from '../../types';
import { X, Edit } from 'lucide-react';
import { TourForm } from './TourForm';
import { InternationalTourForm } from './InternationalTourForm';

interface EditTourModalProps {
  tour: Tour | null;
  slots: TourSlot[];
  currentUser: User;
  onAddTour: (newTour: Tour) => Promise<void>;
  onEditTour?: (updatedTour: Tour) => Promise<void>;
  onDeleteTour?: (tourId: string) => Promise<void>;
  onAddSlot: (newSlot: TourSlot) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onClose: () => void;
}

// Thin modal shell around the same TourForm/InternationalTourForm components used for
// creating tours — editing is just those components rendered with `tour` set instead of a
// dedicated duplicate form.
export function EditTourModal({ tour, slots, currentUser, onAddTour, onEditTour, onDeleteTour, onAddSlot, onDeleteSlot, onShowNotification, onClose }: EditTourModalProps) {
  if (!tour) return null;
  const isIntl = tour.isInternational || tour.category === 'international';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Edit className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Tur Reqlamentini Yeniləyin</h3>
              <p className="text-[10px] text-slate-500 font-medium">Marşrut bələdçisi, kateqoriyası və ətraflı rekvizitlərinə düzəliş edin</p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {isIntl ? (
            <InternationalTourForm
              currentUser={currentUser}
              tour={tour}
              slots={slots}
              onAddTour={onAddTour}
              onEditTour={onEditTour}
              onDeleteTour={onDeleteTour}
              onAddSlot={onAddSlot}
              onDeleteSlot={onDeleteSlot}
              onShowNotification={onShowNotification}
              onNavigateBack={onClose}
            />
          ) : (
            <TourForm
              currentUser={currentUser}
              tour={tour}
              slots={slots}
              category={tour.category as 'peak' | 'camp' | 'hiking' | 'active'}
              onCategoryChange={() => {}}
              onAddTour={onAddTour}
              onEditTour={onEditTour}
              onDeleteTour={onDeleteTour}
              onAddSlot={onAddSlot}
              onDeleteSlot={onDeleteSlot}
              onShowNotification={onShowNotification}
              onNavigateBack={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
