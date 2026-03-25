import React, { useState, useEffect } from 'react'

const LOADING_MESSAGES = [
  "Analyzing your description...",
  "Formatting request for Gemini API...",
  "Sending request to Google servers...",
  "Gemini is writing the animation script (JSON)...",
  "Waiting for Gemini to finish generating...",
  "Decoding coordinates and shapes...",
  "Finalizing canvas instructions..."
]

/**
 * Displays the current generation status as a slim top bar.
 * @param {{ status: 'idle'|'loading'|'success'|'error', errorMessage: string }} props
 */
function StatusPanel({ status, errorMessage }) {
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

  if (status === 'idle') return null

  const configs = {
    loading: {
      bg: 'rgba(124, 58, 237, 0.12)',
      border: 'rgba(124, 58, 237, 0.3)',
      color: '#a78bfa',
      icon: <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />,
      message: status === 'loading' ? LOADING_MESSAGES[loadingMsgIdx] : ''
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      color: '#6ee7b7',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      ),
      message: 'Animation generated successfully! Playing now.'
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      color: '#fca5a5',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      message: errorMessage || 'An error occurred.'
    }
  }

  const cfg = configs[status]
  if (!cfg) return null

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs font-medium animate-fade-in shrink-0"
      style={{ background: cfg.bg, borderBottom: '1px solid ' + cfg.border, color: cfg.color }}
      role="status"
      aria-live="polite"
    >
      {cfg.icon}
      <span>{cfg.message}</span>
    </div>
  )
}

export default StatusPanel
