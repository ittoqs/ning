import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { SettingsSidebar } from './components/SettingsSidebar'
import { HistorySidebar } from './components/HistorySidebar'
import { ChatArea } from './components/ChatArea'
import { SettingsContent } from './components/SettingsContent'

function App() {
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen)
  const isHistoryOpen = useAppStore(state => state.isHistoryOpen)
  const theme = useAppStore(state => state.theme)
  const accent = useAppStore(state => state.accent)

  useEffect(() => {
    const classList = document.documentElement.classList
    classList.toggle('dark', theme === 'dark')
    ;(['blue', 'purple', 'green', 'orange'] as const).forEach(a => classList.remove(`accent-${a}`))
    classList.add(`accent-${accent}`)
  }, [theme, accent])

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden transition-colors duration-300">
      <Sidebar />
      <SettingsSidebar isOpen={isSettingsOpen} />
      <HistorySidebar isOpen={isHistoryOpen} />
      {isSettingsOpen ? <SettingsContent /> : <ChatArea />}
    </div>
  )
}

export default App
