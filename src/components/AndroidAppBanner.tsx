'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function AndroidAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isAndroidDevice = /Android/i.test(ua);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('hide_app_install_banner');
      if (!dismissed && isAndroidDevice) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const dismissed = localStorage.getItem('hide_app_install_banner');
    if (!dismissed && isAndroidDevice) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('hide_app_install_banner', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction if the prompt event isn't available
      alert("To install the app, tap the browser menu (three dots) and select 'Add to Home screen' or 'Install app'.");
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-[#1A1A1A] border border-black/10 dark:border-white/10 text-foreground rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-card-purple/10 border border-card-purple/20 flex items-center justify-center text-card-purple shrink-0">
            <img src="/logo-white.png" alt="LEAD Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-foreground leading-tight">Install LEAD App</h4>
              {isAndroid && (
                <span className="text-[9px] uppercase font-bold tracking-widest bg-card-mint/20 text-card-mint px-2 py-0.5 rounded-full">
                  Android Detected
                </span>
              )}
            </div>
            <p className="text-xs text-black/60 dark:text-white/60 mt-0.5">
              Add to your home screen for quick access & full screen mode.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-black/40 dark:text-white/40 hover:text-foreground p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-card-purple text-black py-2.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition-all shadow-md"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
        <button
          onClick={handleDismiss}
          className="bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 py-2.5 px-3 rounded-2xl font-semibold text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-all"
        >
          Later
        </button>
      </div>
    </div>
  );
}
