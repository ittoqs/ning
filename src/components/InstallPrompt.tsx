import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed (running as standalone PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone || isDismissed) return

    const handler = (e: Event) => {
      // Prevent the browser's default install mini-infobar
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show our custom prompt after a short delay so the user settles in first
      setTimeout(() => setIsVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isDismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    // Remember dismissal for this session
    sessionStorage.setItem('ning-pwa-dismissed', '1')
  }

  if (!isVisible || !deferredPrompt) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-label="Install Ning as desktop app"
    >
      <div className="flex items-center gap-4 bg-surface border border-primary/30 rounded-2xl px-5 py-4 shadow-2xl shadow-primary/10 backdrop-blur-xl max-w-sm w-[calc(100vw-3rem)]">
        {/* Logo */}
        <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
          <img src="/logo.svg" alt="Ning" className="w-6 h-6" style={{ filter: 'invert(49%) sepia(98%) saturate(1724%) hue-rotate(207deg) brightness(102%) contrast(97%)' }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-textMain leading-tight">Install Ning</p>
          <p className="text-xs text-textMuted mt-0.5 leading-tight">
            Open instantly like a native app — no terminal needed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Download size={13} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
