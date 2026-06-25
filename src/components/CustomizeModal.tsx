import { useState } from 'react'

export interface CustomizeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CustomizeModal({ isOpen, onClose }: CustomizeModalProps) {
  const [tone, setTone] = useState('')
  const [length, setLength] = useState('')
  const [modelRole, setModelRole] = useState('')
  const [yourRole, setYourRole] = useState('')
  const [askClarifying, setAskClarifying] = useState(false)
  const [modelNickname, setModelNickname] = useState('')
  const [yourNickname, setYourNickname] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [showAllInstructions, setShowAllInstructions] = useState(false)

  if (!isOpen) return null

  const handleApply = () => {
    // We would save instructions to a store or backend here.
    onClose()
  }

  const handleReset = () => {
    setTone('')
    setLength('')
    setModelRole('')
    setYourRole('')
    setAskClarifying(false)
    setModelNickname('')
    setYourNickname('')
    setAdditionalInstructions('')
    setShowAllInstructions(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white text-black w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Customize Responses</h2>
          <p className="text-gray-600 text-sm">
            Sends a prompt to AI models with your messages with instructions on how to respond. These instructions will apply to all of your conversations going forward.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tone of responses</label>
              <textarea
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Length of responses</label>
              <textarea
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Model role</label>
              <textarea
                value={modelRole}
                onChange={(e) => setModelRole(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Your role</label>
              <textarea
                value={yourRole}
                onChange={(e) => setYourRole(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Model nickname</label>
              <textarea
                value={modelNickname}
                onChange={(e) => setModelNickname(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Your nickname</label>
              <textarea
                value={yourNickname}
                onChange={(e) => setYourNickname(e.target.value)}
                className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Additional instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Additional instructions"
              className="border border-gray-300 rounded-md p-2 bg-transparent text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input
                type="checkbox"
                checked={askClarifying}
                onChange={(e) => setAskClarifying(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium">Ask clarifying questions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input
                type="checkbox"
                checked={showAllInstructions}
                onChange={(e) => setShowAllInstructions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium">Show all instructions</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
