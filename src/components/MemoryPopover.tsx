import { useState, useRef, useEffect } from 'react'
import { Brain, Bot, User, MoreVertical, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { useOllamaStore, MemoryItem } from '../store/useOllamaStore'

export function MemoryPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [newMemoryText, setNewMemoryText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentSessionId = useOllamaStore(state => state.currentSessionId)
  const sessions = useOllamaStore(state => state.sessions)
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const toggleMemory = useOllamaStore(state => state.toggleMemory)
  const addMemory = useOllamaStore(state => state.addMemory)
  const updateMemory = useOllamaStore(state => state.updateMemory)
  const deleteMemory = useOllamaStore(state => state.deleteMemory)

  const isEnabled = currentSession?.memoryEnabled ?? false
  const memories = currentSession?.memories ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!currentSessionId) return null

  const handleAddMemory = () => {
    if (newMemoryText.trim()) {
      addMemory(currentSessionId, newMemoryText.trim(), 'user')
      setNewMemoryText('')
    }
  }

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) {
      updateMemory(currentSessionId, id, editingText.trim())
    }
    setEditingId(null)
    setActiveMenuId(null)
  }

  const startEditing = (memory: MemoryItem) => {
    setEditingId(memory.id)
    setEditingText(memory.content)
    setActiveMenuId(null)
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 flex items-center gap-1.5 rounded border transition-colors text-sm font-medium ${
          isEnabled
            ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
            : 'bg-surface text-textMuted border-border hover:text-textMain hover:bg-white/5'
        }`}
        title="Memori"
      >
        <Brain size={16} />
        <span className="hidden sm:inline">Memori</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-medium text-textMain flex items-center gap-2">
                <Brain size={18} className="text-primary" />
                Memori Sesi
              </h3>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isEnabled}
                  onChange={() => toggleMemory(currentSessionId)}
                />
                <div className="w-9 h-5 bg-background border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <p className="text-xs text-textMuted leading-relaxed">
              Aktifkan memori untuk membiarkan Ning menggunakan konteks dari sesi masa lalu untuk meningkatkan tanggapannya.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {memories.length === 0 ? (
              <div className="text-center text-sm text-textMuted py-8">
                Belum ada memori untuk sesi ini.
              </div>
            ) : (
              memories.map(memory => (
                <div key={memory.id} className="relative group bg-background border border-border rounded-lg p-3 text-sm flex gap-3">
                  <div className="shrink-0 mt-0.5 text-textMuted">
                    {memory.source === 'auto' ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  {editingId === memory.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-surface border border-border rounded px-2 py-1.5 text-textMain focus:outline-none focus:border-primary resize-none min-h-[60px]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="p-1 text-textMuted hover:bg-white/5 rounded">
                          <X size={14} />
                        </button>
                        <button onClick={() => handleSaveEdit(memory.id)} className="p-1 text-primary hover:bg-primary/10 rounded">
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-textMain break-words whitespace-pre-wrap">
                      {memory.content}
                    </div>
                  )}

                  {!editingId && (
                    <div className="shrink-0">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === memory.id ? null : memory.id)}
                        className="p-1 text-textMuted hover:text-textMain hover:bg-white/5 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === memory.id && (
                        <div ref={menuRef} className="absolute right-8 top-2 bg-surface border border-border rounded shadow-lg py-1 z-10 w-28">
                          <button
                            onClick={() => startEditing(memory)}
                            className="w-full px-3 py-1.5 text-left text-xs text-textMain hover:bg-white/5 flex items-center gap-2"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              deleteMemory(currentSessionId, memory.id)
                              setActiveMenuId(null)
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border bg-background flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                placeholder="Tambahkan memori manual..."
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddMemory}
                disabled={!newMemoryText.trim()}
                className="shrink-0 bg-primary text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Tambahkan Memori"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
