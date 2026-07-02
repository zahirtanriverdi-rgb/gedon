import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
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
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-scaleIn font-sans">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            📷 QR Kod İlə Check-in
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-4 bg-slate-50 relative min-h-[350px]">
          <p className="text-xs text-slate-500 mb-4 text-center font-medium">Biletin üzərindəki QR kodu kameraya yaxınlaşdırın</p>
          <div id="reader" className="w-full rounded-xl overflow-hidden shadow-sm bg-black border-2 border-dashed border-slate-300"></div>
        </div>
      </div>
    </div>
  );
}
