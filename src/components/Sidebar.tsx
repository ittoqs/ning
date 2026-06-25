import { MessageSquarePlus, Search, Settings } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useOllamaStore } from '../store/useOllamaStore'
import { Button } from '@/components/ui/button'
import { useTranslation } from '../hooks/useTranslation'

export function Sidebar() {
  const { t } = useTranslation()
  const toggleSettings = useAppStore(state => state.toggleSettings)
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen)
  const toggleHistory = useAppStore(state => state.toggleHistory)
  const isHistoryOpen = useAppStore(state => state.isHistoryOpen)
  const createNewSession = useOllamaStore(state => state.createNewSession)

  return (
    <div className="w-16 h-full bg-surface border-r border-border flex flex-col items-center py-4 shrink-0 z-20 transition-colors duration-300">
      <div className="w-10 h-10 mb-8 flex items-center justify-center">
        <div 
          className="w-full h-full bg-primary" 
          style={{ 
            maskImage: 'url(/logo.svg)', 
            maskSize: 'contain', 
            maskRepeat: 'no-repeat', 
            maskPosition: 'center',
            WebkitMaskImage: 'url(/logo.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center'
          }} 
        />
      </div>
      
      <div className="flex flex-col gap-4 flex-1 w-full px-2">
        <Button 
          variant="ghost"
          size="icon"
          onClick={createNewSession}
          className="w-full aspect-square flex items-center justify-center rounded-lg text-textMuted hover:text-textMain transition-colors" 
          title={t('newChat')}
        >
          <MessageSquarePlus size={22} />
        </Button>
        <Button 
          variant={isHistoryOpen ? "default" : "ghost"}
          size="icon"
          onClick={toggleHistory}
          className={`w-full aspect-square flex items-center justify-center rounded-lg transition-colors ${
            isHistoryOpen ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-textMuted hover:text-textMain'
          }`} 
          title={t('historyChatTitle')}
        >
          <Search size={22} />
        </Button>
      </div>

      <div className="flex flex-col gap-4 w-full px-2">
        <Button 
          variant={isSettingsOpen ? "default" : "ghost"}
          size="icon"
          onClick={toggleSettings}
          className={`w-full aspect-square flex items-center justify-center rounded-lg transition-colors ${
            isSettingsOpen ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-textMuted hover:text-textMain'
          }`} 
          title={t('settingsTitle')}
        >
          <Settings size={22} />
        </Button>
      </div>
    </div>
  )
}
