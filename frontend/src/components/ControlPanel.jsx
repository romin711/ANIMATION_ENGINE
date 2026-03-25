import React, { useState, useEffect } from 'react'
import { Sparkles, History, Send, PaintBucket, Shapes, Timer, FastForward, Info } from 'lucide-react'

const SUGGESTIONS = [
  "A glowing blue planet orbiting a star",
  "A red square spinning continuously",
  "Three bouncing colorful circles"
]

const LOADING_MESSAGES = [
  "Analyzing your prompt...",
  "Formatting request for Gemini API...",
  "Sending request to Google servers...",
  "Gemini is writing the animation script (JSON)...",
  "Waiting for Gemini to finish generating...",
  "Decoding coordinates and shapes...",
  "Finalizing canvas instructions..."
]

export default function ControlPanel({ onGenerate, status, history, onSelectHistory }) {
  const [activeTab, setActiveTab] = useState('create')
  
  // Prompt States
  const [description, setDescription] = useState("A glowing blue planet orbiting a bright yellow star.")
  const [speed, setSpeed] = useState('normal') // slow, normal, fast
  const [shape, setShape] = useState('mixed') // circle, rect, mixed
  const [color, setColor] = useState('#8b5cf6') // default purple
  const [duration, setDuration] = useState(2)

  // Loading MSG
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  useEffect(() => {
    let interval
    if (status === 'loading') {
      setLoadingMsgIdx(0)
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1))
      }, 2500)
    }
    return () => clearInterval(interval)
  }, [status])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description.trim() || status === 'loading') return
    onGenerate({ description, speed, shape, color, duration })
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/40 backdrop-blur-md">
      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-white/5 shrink-0">
        <button 
          onClick={() => setActiveTab('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <Sparkles size={16} /> Create
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <History size={16} /> History ({history.length})
        </button>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-5 gap-6 custom-scrollbar">
          
          {/* Prompt Section */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex justify-between">
              Animation Prompt
              <span className="text-zinc-500 font-normal normal-case">Ctrl + Enter</span>
            </label>
            <div className="relative group">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(e)
                }}
                disabled={status === 'loading'}
                className="w-full h-32 glass-input rounded-xl p-4 text-sm resize-none"
                placeholder="Describe your 2D animation..."
                spellCheck={false}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
            </div>
            
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(sug)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors truncate max-w-[180px]"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-white/5" />

          {/* Controls Section */}
          <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Visual Settings</label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Shape */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Shapes size={12}/> Primary Shape</span>
                <select 
                  value={shape} 
                  onChange={(e) => setShape(e.target.value)}
                  className="glass-input text-xs rounded-lg px-3 py-2 outline-none cursor-pointer appearance-none"
                >
                  <option value="circle" className="bg-zinc-900">Circle</option>
                  <option value="rect" className="bg-zinc-900">Rectangle</option>
                  <option value="mixed" className="bg-zinc-900">Mixed / Any</option>
                </select>
              </div>
              
              {/* Color */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5"><PaintBucket size={12}/> Base Color</span>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded shrink-0 cursor-pointer overflow-hidden border border-white/10 p-0"
                  />
                  <input 
                    type="text" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="glass-input text-xs rounded-lg px-2 py-2 flex-1 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Timer size={12}/> Avg. Duration</span>
                <div className="flex items-center gap-2 glass-input rounded-lg px-3 py-2">
                  <input 
                    type="range" min="1" max="30" step="1"
                    value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                    className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono w-6 text-right">{duration}s</span>
                </div>
              </div>

              {/* Speed Preset */}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5"><FastForward size={12}/> Motion Speed</span>
                <select 
                  value={speed} 
                  onChange={(e) => setSpeed(e.target.value)}
                  className="glass-input text-xs rounded-lg px-3 py-2 outline-none cursor-pointer appearance-none"
                >
                  <option value="slow" className="bg-zinc-900">Slow & Smooth</option>
                  <option value="normal" className="bg-zinc-900">Normal</option>
                  <option value="fast" className="bg-zinc-900">Snappy</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={status === 'loading' || !description.trim()}
              className="btn-primary w-full h-12 rounded-xl flex items-center justify-center gap-2 overflow-hidden relative group"
            >
              {status === 'loading' ? (
                <>
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  <span className="relative z-10 flex items-center gap-2 text-sm font-semibold truncate px-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </span>
                </>
              ) : (
                <span className="relative z-10 flex items-center gap-2 text-sm font-semibold">
                  <Send size={16} /> Generate Animation
                </span>
              )}
            </button>
          </div>
          
          {/* Subtle Explanation */}
          <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5 mt-2">
            <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Your prompt and visual settings are secretly merged and sent to the <strong>Gemini AI</strong>, which acts as a director to orchestrate the SVG canvas live!
            </p>
          </div>

        </form>
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto p-5 gap-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 opacity-60">
              <History size={32} />
              <p className="text-sm">No animation history yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => onSelectHistory(item)}
              >
                <p className="text-xs text-zinc-300 line-clamp-2">{item.prompt}</p>
                <span className="text-[10px] text-zinc-500 mt-2 block">
                  {new Date(item.id).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
