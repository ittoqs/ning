import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, SettingsTab } from '../store/useAppStore'
import { Monitor, Cpu, Box, Cloud, HardDrive, Server, Database, X } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'
import { TranslationKeys } from '../locales/translations'

const TABS: { id: SettingsTab, icon: React.ElementType, labelKey: TranslationKeys }[] = [
  { id: 'Appearance', icon: Monitor, labelKey: 'settingsAppearance' },
  { id: 'Hardware', icon: Cpu, labelKey: 'settingsHardware' },
  { id: 'Engine', icon: Box, labelKey: 'settingsEngine' },
  { id: 'Hub', icon: Cloud, labelKey: 'settingsHub' },
  { id: 'Model', icon: HardDrive, labelKey: 'settingsModel' },
  { id: 'MCP Server', icon: Server, labelKey: 'settingsMcp' },
  { id: 'RAG', icon: Database, labelKey: 'settingsRag' },
]

export function SettingsSidebar({ isOpen }: { isOpen: boolean }) {
  const activeTab = useAppStore(state => state.activeSettingsTab)
  const setTab = useAppStore(state => state.setSettingsTab)
  const toggleSettings = useAppStore(state => state.toggleSettings)
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0, x: -50 }}
          animate={{ width: 280, opacity: 1, x: 0 }}
          exit={{ width: 0, opacity: 0, x: -50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full bg-surface/80 backdrop-blur-xl border-r border-border shrink-0 overflow-hidden flex flex-col z-10"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-lg">{t('settingsTitle')}</h2>
            <button onClick={toggleSettings} className="p-1 rounded-md hover:bg-white/10 text-textMuted hover:text-textMain">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                    : 'text-textMuted hover:bg-white/5 hover:text-textMain'
                }`}
              >
                <tab.icon size={18} />
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
