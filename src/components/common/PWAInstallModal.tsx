import React from 'react';
import { X, Smartphone, Download, Share, PlusSquare, Monitor, CheckCircle2, Info } from 'lucide-react';
import { PWAInstallState } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  pwa: PWAInstallState;
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ pwa, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-[#16171D] border border-[#2B2D3A] rounded-2xl p-6 shadow-2xl text-[#EDEDF0] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-4 border-b border-[#2B2D3A]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#21232D] border border-[#343747] flex items-center justify-center text-[#F3F4F6]">
              <Smartphone className="h-5 w-5 text-neutral-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Install AI Heaven</h3>
              <p className="text-xs text-[#9CA1B2]">Progressive Web Application</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA1B2] hover:text-white hover:bg-[#21232D] transition-colors"
            aria-label="Close install modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-xs">
          {pwa.isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>AI Heaven is already installed</span>
              </div>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed font-sans">
                The application is running in standalone desktop/mobile mode with offline static asset caching.
              </p>
            </div>
          ) : pwa.isIOS ? (
            <div className="space-y-3">
              <p className="text-[#EDEDF0] leading-relaxed">
                iOS Safari requires installing web applications through the system share menu:
              </p>
              <ol className="space-y-2.5 font-sans bg-[#1C1E26] p-3.5 rounded-xl border border-[#2B2D3A]">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2B2D3A] text-[10px] font-bold">1</span>
                  <span>Tap the <strong className="text-white inline-flex items-center gap-1 font-medium"><Share className="h-3 w-3 inline" /> Share</strong> button in Safari toolbar</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2B2D3A] text-[10px] font-bold">2</span>
                  <span>Scroll down and select <strong className="text-white inline-flex items-center gap-1 font-medium"><PlusSquare className="h-3 w-3 inline" /> Add to Home Screen</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2B2D3A] text-[10px] font-bold">3</span>
                  <span>Tap <strong className="text-white font-medium">Add</strong> in top right corner</span>
                </li>
              </ol>
            </div>
          ) : pwa.isInstallable ? (
            <div className="space-y-3">
              <p className="text-[#EDEDF0] leading-relaxed">
                Click below to launch your browser’s native installation prompt. AI Heaven will be added to your desktop or mobile app launcher with dedicated window chrome.
              </p>
              <button
                onClick={async () => {
                  const res = await pwa.promptInstall();
                  if (res === 'accepted') {
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-xs transition-all shadow-md cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Launch Browser Install Prompt</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1C1E26] border border-[#2B2D3A] text-[#EDEDF0]">
                <Info className="h-4 w-4 text-[#9CA1B2] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your browser hasn’t triggered the automatic prompt yet or is inside an iframe preview. You can install AI Heaven manually:
                </p>
              </div>
              <ul className="space-y-2 bg-[#1C1E26] p-3.5 rounded-xl border border-[#2B2D3A] text-[#9CA1B2]">
                <li className="flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                  <span><strong>Chrome / Edge:</strong> Click the <strong className="text-white">Install</strong> icon in the right side of the address bar.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                  <span><strong>Android:</strong> Tap browser menu (⋮) → <strong className="text-white">Add to Home Screen / Install app</strong>.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#2B2D3A] flex items-center justify-between text-[11px] text-[#9CA1B2]">
          <span>Offline shell ready</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#21232D] hover:bg-[#2B2D3A] text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
