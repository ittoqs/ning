import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { useOllamaStore } from '../store/useOllamaStore'
import { X, MessageSquare, Trash2 } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'

export function HistorySidebar({ isOpen }: { isOpen: boolean }) {
  const { t } = useTranslation()
  const toggleHistory = useAppStore(state => state.toggleHistory)
  const sessions = useOllamaStore(state => state.sessions)
  const currentSessionId = useOllamaStore(state => state.currentSessionId)
  const loadSession = useOllamaStore(state => state.loadSession)
  const deleteSession = useOllamaStore(state => state.deleteSession)

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

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
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <h2 className="font-semibold text-lg text-textMain">{t('historyChatTitle')}</h2>
            <button onClick={toggleHistory} className="p-1 rounded-md hover:bg-white/10 text-textMuted hover:text-textMain transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {sortedSessions.length === 0 ? (
              <div className="text-center text-sm text-textMuted mt-10">
                {t('noHistoryYet')}
              </div>
            ) : (
              sortedSessions.map((session) => (
                <div 
                  key={session.id}
                  className={`group relative w-full flex items-center justify-between px-3 py-3 text-sm rounded-lg transition-colors cursor-pointer ${
                    currentSessionId === session.id 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'text-textMuted hover:bg-white/5 hover:text-textMain border border-transparent'
                  }`}
                  onClick={() => loadSession(session.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-500 transition-all text-textMuted"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
