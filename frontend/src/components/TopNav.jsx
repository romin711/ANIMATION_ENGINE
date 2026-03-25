import React from 'react'
import { Sparkles, User, Activity } from 'lucide-react'

export default function TopNav({ status }) {
  const getStatusDisplay = () => {
    switch(status) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Generating...
          </div>
        )
      case 'success':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ready
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Error
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-medium">
            <Activity size={12} />
            Idle
          </div>
        )
    }
  }

  return (
    <header className="flex-shrink-0 h-16 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md px-6 flex items-center justify-between z-20">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
            GravityStudio <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">v1.0</span>
          </h1>
          <p className="text-[10px] text-zinc-500">Powered by Gemini AI</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {getStatusDisplay()}
        
        <div className="w-px h-6 bg-white/10" />
        
        <button className="w-8 h-8 rounded-full bg-zinc-800/50 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <User size={16} />
        </button>
      </div>
    </header>
  )
}
