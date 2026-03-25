import React, { useState } from 'react'

const EXAMPLE_INPUT = `A glowing blue planet orbits a bright yellow star. The planet should slowly rotate and pulse. The star should emit a radial glow effect.`

/**
 * Left panel: Textarea for animation description + Generate button.
 * @param {{ onGenerate: (desc: string) => void, isLoading: boolean }} props
 */
function JSONInputPanel({ onGenerate, isLoading }) {
  const [description, setDescription] = useState(EXAMPLE_INPUT)

  function handleSubmit(event) {
    event.preventDefault()
    if (!description.trim()) return
    onGenerate(description.trim())
  }

  function handleKeyDown(event) {
    // Allow Ctrl+Enter or Cmd+Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSubmit(event)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Panel heading */}
      <div>
        <h2 className="text-sm font-semibold text-white">Animation Description</h2>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
          Describe what to animate. Press <kbd className="px-1 py-0.5 rounded text-xs font-mono"
            style={{ background: '#1e1e3f', color: '#a78bfa' }}>Ctrl+Enter</kbd> to generate.
        </p>
      </div>

      {/* Textarea */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-3">
        <textarea
          id="animation-description"
          className="code-textarea flex-1"
          value={description}
          onChange={function (e) { setDescription(e.target.value) }}
          onKeyDown={handleKeyDown}
          placeholder="Describe your animation here..."
          disabled={isLoading}
          spellCheck={false}
        />

        {/* Generate button */}
        <button
          type="submit"
          className="btn-primary animate-pulse-glow"
          disabled={isLoading || !description.trim()}
          id="generate-btn"
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Generate Animation
            </>
          )}
        </button>
      </form>

      {/* Tips */}
      <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#0d0d1a', border: '1px solid #1e1e3f', color: '#6b7280' }}>
        <p className="font-semibold mb-1" style={{ color: '#a78bfa' }}>💡 Tips</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Mention shapes: circle, rectangle, text</li>
          <li>Describe motion: move, bounce, spin, fade</li>
          <li>Mention colors, sizes, and timing</li>
          <li>Be specific for better results</li>
        </ul>
      </div>

      {/* How it Works */}
      <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: '#0d0d1a', border: '1px solid #1e1e3f', color: '#6b7280' }}>
        <p className="font-semibold mb-1 text-emerald-400" style={{ color: '#6ee7b7' }}>⚙️ How it works</p>
        <ol className="list-decimal list-inside space-y-1 opacity-90">
          <li>You type what you want to animate.</li>
          <li>We secretly send your text to the <strong>Gemini API</strong>.</li>
          <li>Gemini acts like a director and writes a "script" holding dimensions, shapes, and movement timings.</li>
          <li>Our canvas reads this script and instantly draws the animation for you to see!</li>
        </ol>
      </div>
    </div>
  )
}

export default JSONInputPanel
