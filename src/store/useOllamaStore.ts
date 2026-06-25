import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ollamaClient, OllamaModel, ChatMessage } from '../api/ollamaClient'
import { useRagStore } from './useRagStore'

export interface AppMessage extends ChatMessage {
  id: string;
  images?: string[];
}

export interface MemoryItem {
  id: string;
  content: string;
  source: 'user' | 'auto';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AppMessage[];
  updatedAt: number;
  memoryEnabled?: boolean;
  memories?: MemoryItem[];
}

interface OllamaState {
  isOnline: boolean;
  localModels: OllamaModel[];
  selectedModel: string;
  sessions: ChatSession[];
  currentSessionId: string | null;
  isGenerating: boolean;
  streamingText: string;
  
  runningModels: string[];
  isWarningModalOpen: boolean;
  pendingModelToRun: string | null;
  pullingModels: Record<string, { status: string, progress: number }>;
  
  checkStatus: () => Promise<void>;
  fetchModels: () => Promise<void>;
  syncRunningModels: () => Promise<void>;
  setSelectedModel: (model: string) => void;
  sendMessage: (content: string, images?: string[]) => Promise<void>;
  abortGeneration: () => void;
  
  createNewSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  
  toggleMemory: (sessionId: string) => void;
  addMemory: (sessionId: string, content: string, source: 'user' | 'auto') => void;
  updateMemory: (sessionId: string, memoryId: string, content: string) => void;
  deleteMemory: (sessionId: string, memoryId: string) => void;

  initPolling: () => void;
  requestRunModel: (modelName: string) => void;
  confirmRunModel: () => Promise<void>;
  cancelRunModel: () => void;
  stopModel: (modelName: string) => Promise<void>;
  startPullModel: (modelName: string, forceRestart?: boolean) => void;
}

let abortController: AbortController | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export const useOllamaStore = create<OllamaState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      localModels: [],
      selectedModel: 'llama3.2:1b',
      sessions: [],
      currentSessionId: null,
      isGenerating: false,
      streamingText: '',
      runningModels: [],
      isWarningModalOpen: false,
      pendingModelToRun: null,
      pullingModels: {},

      initPolling: () => {
        if (pollInterval) clearInterval(pollInterval);
        // Initial check
        get().checkStatus();
        // Poll every 3 seconds to keep running models in sync with terminal
        pollInterval = setInterval(() => {
          get().checkStatus();
        }, 3000);
      },

      checkStatus: async () => {
        const isOnline = await ollamaClient.checkHealth();
        set({ isOnline });
        if (isOnline) {
          get().syncRunningModels();
          // Resume any pending pulls from persisted state
          const { pullingModels, startPullModel } = get();
          Object.keys(pullingModels).forEach(modelName => {
            // Force restart the pull without the early return check
            startPullModel(modelName, true);
          });
        }
      },

      fetchModels: async () => {
        const models = await ollamaClient.fetchTags();
        set({ localModels: models });
      },

      syncRunningModels: async () => {
        const running = await ollamaClient.fetchRunningModels();
        set({ runningModels: running.map(m => m.name) });
      },

      setSelectedModel: (model) => set({ selectedModel: model }),

      createNewSession: () => {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: 'Percakapan Baru',
          messages: [],
          updatedAt: Date.now(),
          memoryEnabled: false,
          memories: []
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id
        }));
      },

      loadSession: (id: string) => {
        set({ currentSessionId: id });
      },

      deleteSession: (id: string) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== id);
          let newCurrentId = state.currentSessionId;
          if (state.currentSessionId === id) {
            if (newSessions.length > 0) {
              newCurrentId = newSessions[0].id;
            } else {
              // Create a fresh session if all deleted
              const fresh: ChatSession = {
                id: Date.now().toString(),
                title: 'Percakapan Baru',
                messages: [],
                updatedAt: Date.now(),
                memoryEnabled: false,
                memories: []
              };
              newSessions.push(fresh);
              newCurrentId = fresh.id;
            }
          }
          return { sessions: newSessions, currentSessionId: newCurrentId };
        });
      },

      toggleMemory: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, memoryEnabled: !s.memoryEnabled } : s
          )
        }));
      },

      addMemory: (sessionId: string, content: string, source: 'user' | 'auto') => {
        set((state) => ({
          sessions: state.sessions.map(s => {
            if (s.id === sessionId) {
              const newMemory: MemoryItem = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                content,
                source
              };
              return { ...s, memories: [...(s.memories || []), newMemory] };
            }
            return s;
          })
        }));
      },

      updateMemory: (sessionId: string, memoryId: string, content: string) => {
        set((state) => ({
          sessions: state.sessions.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                memories: (s.memories || []).map(m =>
                  m.id === memoryId ? { ...m, content } : m
                )
              };
            }
            return s;
          })
        }));
      },

      deleteMemory: (sessionId: string, memoryId: string) => {
        set((state) => ({
          sessions: state.sessions.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                memories: (s.memories || []).filter(m => m.id !== memoryId)
              };
            }
            return s;
          })
        }));
      },

      requestRunModel: (modelName: string) => {
        const { runningModels } = get();
        if (runningModels.length > 0 && !runningModels.includes(modelName)) {
          set({ isWarningModalOpen: true, pendingModelToRun: modelName });
        } else {
          // If no models are running, just load it
          set({ pendingModelToRun: modelName });
          get().confirmRunModel();
        }
      },

      confirmRunModel: async () => {
        const { pendingModelToRun } = get();
        if (pendingModelToRun) {
          set({ isWarningModalOpen: false });
          // Minta Ollama backend untuk me-load model ini ke memory
          await ollamaClient.loadModel(pendingModelToRun);
          set({ pendingModelToRun: null });
          await get().syncRunningModels();
        }
      },

      cancelRunModel: () => {
        set({ isWarningModalOpen: false, pendingModelToRun: null });
      },

      stopModel: async (modelName: string) => {
        // Minta Ollama backend untuk membuang model dari memory
        await ollamaClient.unloadModel(modelName);
        await get().syncRunningModels();
      },

      startPullModel: (modelName: string, forceResume: boolean = false) => {
        const { pullingModels } = get();
        if (!forceResume && pullingModels[modelName]) return; 

        set((state) => ({
          pullingModels: {
            ...state.pullingModels,
            [modelName]: { 
              status: forceResume ? 'Resuming...' : 'Starting...', 
              progress: state.pullingModels[modelName]?.progress || 0 
            }
          }
        }));

        ollamaClient.pullModel(
          modelName,
          (status, progress) => {
            set((state) => ({
              pullingModels: {
                ...state.pullingModels,
                [modelName]: { status, progress }
              }
            }));
          },
          () => {
            set((state) => {
              const newPulling = { ...state.pullingModels };
              delete newPulling[modelName];
              return { pullingModels: newPulling };
            });
            get().fetchModels();
          },
          (error) => {
            console.error("Error pulling model:", error);
            set((state) => {
              const newPulling = { ...state.pullingModels };
              delete newPulling[modelName];
              return { pullingModels: newPulling };
            });
          }
        );
      },

      abortGeneration: () => {
        if (abortController) {
          abortController.abort();
          abortController = null;
        }
      },

      sendMessage: async (content: string, images?: string[]) => {
        const { selectedModel, sessions, currentSessionId } = get();
        
        if (content.trim() === '' && (!images || images.length === 0)) return;

        // If no active session, create one implicitly
        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
          activeSessionId = Date.now().toString();
          set({
            sessions: [{
              id: activeSessionId,
              title: 'Percakapan Baru',
              messages: [],
              updatedAt: Date.now(),
              memoryEnabled: false,
              memories: []
            }, ...sessions],
            currentSessionId: activeSessionId
          });
        }

        const userMessage: AppMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          images
        };
        
        // Push user message to current session and auto-generate title if it's the first message
        set((state) => {
          const updatedSessions = state.sessions.map(s => {
            if (s.id === activeSessionId) {
              const newTitle = s.messages.length === 0 ? content.slice(0, 20) + (content.length > 20 ? '...' : '') : s.title;
              return {
                ...s,
                title: newTitle,
                messages: [...s.messages, userMessage],
                updatedAt: Date.now()
              };
            }
            return s;
          });
          return { 
            sessions: updatedSessions,
            isGenerating: true,
            streamingText: ''
          };
        });

        // Current session messages for API history
        const activeSession = get().sessions.find(s => s.id === activeSessionId);
        let historyForApi: ChatMessage[] = (activeSession?.messages || []).map(m => {
          const chatMsg: ChatMessage = {
            role: m.role,
            content: m.content
          };
          if (m.images && m.images.length > 0) {
            chatMsg.images = m.images;
          }
          return chatMsg;
        });

        // === MEMORY INJECTION ===
        if (activeSession?.memoryEnabled && activeSession.memories && activeSession.memories.length > 0) {
          const memoryContext = activeSession.memories.map(m => m.content).join('\n');
          historyForApi = [
            {
              role: 'system',
              content: `Gunakan informasi berikut dari percakapan sebelumnya jika relevan:\nMemori:\n${memoryContext}`
            },
            ...historyForApi
          ];
        }
        // === END MEMORY INJECTION ===

        // === RAG INJECTION ===
        const ragStore = useRagStore.getState();
        if (ragStore.isRagEnabled) {
          const relevantChunks = await ragStore.searchRelevantChunks(content, 3);
          if (relevantChunks.length > 0) {
            const contextStr = relevantChunks.join('\n\n');
            // Inject a system prompt at the beginning to provide context
            historyForApi = [
              {
                role: 'system',
                content: `Gunakan informasi berikut sebagai konteks utama untuk menjawab pertanyaan.\nKonteks Dokumen:\n${contextStr}`
              },
              ...historyForApi
            ];
          }
        }
        // === END RAG INJECTION ===

        abortController = new AbortController();

        ollamaClient.chatStream(
          selectedModel,
          historyForApi,
          (chunk) => {
            set((state) => ({ streamingText: state.streamingText + chunk }));
          },
          () => {
            const { streamingText } = get();
            if (streamingText) {
              const assistantMessage: AppMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: streamingText
              };
              set((state) => {
                const currentSession = state.sessions.find(s => s.id === activeSessionId);
                const updatedSessions = state.sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: Date.now() } : s);

                // Auto-save brief memory
                if (currentSession?.memoryEnabled) {
                   const autoMemoryText = `User: ${content} | Ning: ${streamingText.slice(0, 50)}...`;
                   const newMemory: MemoryItem = {
                     id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                     content: autoMemoryText,
                     source: 'auto'
                   };
                   const finalSessions = updatedSessions.map(s => s.id === activeSessionId ? { ...s, memories: [...(s.memories || []), newMemory] } : s);
                   return {
                     sessions: finalSessions,
                     isGenerating: false,
                     streamingText: ''
                   };
                }

                return {
                  sessions: updatedSessions,
                  isGenerating: false,
                  streamingText: ''
                };
              });
            } else {
              set({ isGenerating: false });
            }
            abortController = null;
          },
          (error) => {
            if (error.message === 'Aborted') {
              const { streamingText } = get();
              if (streamingText) {
                const assistantMessage: AppMessage = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: streamingText
                };
                set((state) => ({ 
                  sessions: state.sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMessage], updatedAt: Date.now() } : s),
                  isGenerating: false,
                  streamingText: ''
                }));
              } else {
                set({ isGenerating: false });
              }
            } else {
              console.error(error);
              const errorMessage: AppMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Error: Failed to connect to engine.'
              };
              set((state) => ({ 
                sessions: state.sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() } : s),
                isGenerating: false,
                streamingText: ''
              }));
            }
            abortController = null;
          },
          abortController.signal
        );
      }
    }),
    {
      name: 'ning-storage',
      partialize: (state) => ({ 
        sessions: state.sessions, 
        currentSessionId: state.currentSessionId,
        selectedModel: state.selectedModel,
        pullingModels: state.pullingModels 
      }),
    }
  )
)
