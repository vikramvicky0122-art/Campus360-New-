import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95"
          title="Install Campus Bazaar App on Android"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Android App</span>
        </button>
      )}

      {isIOS && !deferredPrompt && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Add to Phone</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install on Mobile Screen</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                1. Tap the <strong>Share</strong> button in your browser toolbar.
              </p>
              <p>
                2. Select <strong>Add to Home Screen</strong> from the action sheet.
              </p>
              <p>
                3. Campus Bazaar will launch as a standalone, full-screen mobile app with offline capability.
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
