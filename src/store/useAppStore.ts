import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SettingsTab = 'Appearance' | 'Hardware' | 'Engine' | 'Hub' | 'Model' | 'MCP Server' | 'RAG' | null;

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  status: 'connected' | 'disconnected' | 'error';
}

interface AppState {
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;
  activeSettingsTab: SettingsTab;
  theme: 'dark' | 'light';
  accent: 'blue' | 'purple' | 'green' | 'orange';
  mcpServers: MCPServer[];
  toggleSettings: () => void;
  toggleHistory: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAccent: (accent: 'blue' | 'purple' | 'green' | 'orange') => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  addMcpServer: (server: Omit<MCPServer, 'id' | 'status'>) => void;
  removeMcpServer: (id: string) => void;
  setMcpServerStatus: (id: string, status: MCPServer['status']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isSettingsOpen: false,
      isHistoryOpen: false,
      activeSettingsTab: 'Appearance',
      theme: 'light',
      accent: 'blue',
      chatInput: '',
      mcpServers: [
        { id: 'default-fs', name: 'Local File System', url: 'stdio://', status: 'connected' }
      ],
      setChatInput: (input) => set({ chatInput: input }),
      toggleSettings: () => set((state) => ({ 
        isSettingsOpen: !state.isSettingsOpen,
        isHistoryOpen: false,
        activeSettingsTab: !state.isSettingsOpen ? 'Appearance' : state.activeSettingsTab
      })),
      toggleHistory: () => set((state) => ({
        isHistoryOpen: !state.isHistoryOpen,
        isSettingsOpen: false
      })),
      setSettingsTab: (tab) => set({ activeSettingsTab: tab, isSettingsOpen: true, isHistoryOpen: false }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      addMcpServer: (server) => set((state) => ({
        mcpServers: [...state.mcpServers, { ...server, id: Date.now().toString(), status: 'disconnected' }]
      })),
      removeMcpServer: (id) => set((state) => ({
        mcpServers: state.mcpServers.filter(s => s.id !== id)
      })),
      setMcpServerStatus: (id, status) => set((state) => ({
        mcpServers: state.mcpServers.map(s => s.id === id ? { ...s, status } : s)
      }))
    }),
    {
      name: 'ning-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        mcpServers: state.mcpServers
      })
    }
  )
)
