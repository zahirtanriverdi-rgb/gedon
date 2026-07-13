import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

// Shared scan-feedback helper — short WebAudio beep + device vibration so an operator
// checking people in at a noisy/busy entrance gets a physical/audible confirmation
// without needing to look at the screen. Silently no-ops on desktop browsers or when
// the device/browser doesn't support vibration or audio (e.g. no user gesture yet).
export type ScanFeedbackKind = 'success' | 'duplicate' | 'error';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playTone(freq: number, durationMs: number, delayMs = 0, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  if (!ctx) return;
  const startAt = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.02);
}

export function playScanFeedback(kind: ScanFeedbackKind) {
  try {
    if (kind === 'success') {
      playTone(880, 110);
      if (navigator.vibrate) navigator.vibrate(60);
    } else if (kind === 'duplicate') {
      playTone(660, 90);
      playTone(660, 90, 140);
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    } else {
      playTone(220, 220, 0, 'square');
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
  } catch {
    // Best-effort only — never let feedback errors interrupt the check-in flow.
  }
}

export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!isOpen) return;

    let scanner: Html5QrcodeScanner | null = null;
    let isRendered = false;

    const initScanner = () => {
      scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      }, false);

      scanner.render((text) => {
        if (!isRendered) {
          isRendered = true; // Prevent multiple triggers
          // Instant "scan registered" pulse — separate from the later success/duplicate/error
          // sound that CrmTab plays once the backend check-in call actually resolves.
          if (navigator.vibrate) navigator.vibrate(25);
          onScan(text);
          if (scanner) {
            scanner.clear().catch(console.error);
          }
        }
      }, () => {});
    };

    const timer = setTimeout(initScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-scaleIn font-sans max-h-[92vh] flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center flex-shrink-0 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            📷 {t('vendorMisc.qrScannerModal.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer p-2 -mr-2 rounded-lg active:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-4 bg-slate-50 relative overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <p className="text-xs text-slate-500 mb-4 text-center font-medium">{t('vendorMisc.qrScannerModal.instructions')}</p>
          <div id="reader" className="w-full rounded-xl overflow-hidden shadow-sm bg-black border-2 border-dashed border-slate-300"></div>
        </div>
      </div>
    </div>
  );
}
