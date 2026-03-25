import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Play, Pause, RotateCcw, Download, Sparkles, AlertCircle } from 'lucide-react'

export default function AnimationCanvas({ animationData, status, errorMessage }) {
  const svgRef = useRef(null)
  const timelineRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportDuration, setExportDuration] = useState(5)

  // Initialize and manage GSAP master timeline
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }

    if (!animationData || !svgRef.current) return

    const masterTimeline = gsap.timeline({
      onUpdate: function() {
        setProgress(this.progress() * 100)
      },
      onComplete: () => setIsPlaying(false),
      onStart: () => setIsPlaying(true)
    })
    
    timelineRef.current = masterTimeline

    animationData.timeline.forEach((anim) => {
      const targetEl = svgRef.current.querySelector('#' + CSS.escape(anim.target))
      if (!targetEl) return

      const gsapVars = buildGsapVars(anim)
      masterTimeline.fromTo(targetEl, gsapVars.from, gsapVars.to, anim.delay || 0)
    })

    return () => {
      if (timelineRef.current) timelineRef.current.kill()
    }
  }, [animationData])

  const togglePlay = () => {
    if (!timelineRef.current) return
    if (timelineRef.current.paused()) {
      if (timelineRef.current.progress() === 1) timelineRef.current.restart()
      else timelineRef.current.play()
      setIsPlaying(true)
    } else {
      timelineRef.current.pause()
      setIsPlaying(false)
    }
  }

  const restart = () => {
    if (!timelineRef.current) return
    timelineRef.current.restart()
    setIsPlaying(true)
  }

  const handleScrub = (e) => {
    const value = parseFloat(e.target.value)
    setProgress(value)
    if (timelineRef.current) {
      timelineRef.current.progress(value / 100)
      if (isPlaying) timelineRef.current.pause()
      setIsPlaying(false)
    }
  }

  const exportVideo = async () => {
    if (!animationData || !svgRef.current || !timelineRef.current || isExporting) return
    setIsExporting(true)
    
    // Save current GSAP state
    const wasPlaying = isPlaying
    if (wasPlaying) timelineRef.current.pause()
    const originalProgress = timelineRef.current.progress()

    // Setup invisible canvas for stream
    const canvas = document.createElement('canvas')
    canvas.width = animationData.canvas.width
    canvas.height = animationData.canvas.height
    const ctx = canvas.getContext('2d')
    
    // Attempt standard browser media recording (WebM)
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks = []
    
    recorder.ondataavailable = e => chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'animation.webm'
      a.click()
      URL.revokeObjectURL(url)
      
      setIsExporting(false)
      // Restore initial state
      timelineRef.current.progress(originalProgress)
      if (wasPlaying) togglePlay()
    }

    recorder.start()

    const baseDuration = timelineRef.current.duration()
    const targetDuration = exportDuration === 'auto' 
      ? (baseDuration === Infinity ? 5 : baseDuration)
      : exportDuration

    timelineRef.current.pause(0)
    let startTime = performance.now()

    // Loop renderer using requestAnimationFrame for proper timing
    function drawFrame(now) {
      const elapsed = (now - startTime) / 1000
      if (elapsed > targetDuration) {
        recorder.stop()
        return
      }

      timelineRef.current.time(elapsed)
      
      const svgData = new XMLSerializer().serializeToString(svgRef.current)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      
      img.onload = () => {
        ctx.fillStyle = animationData.canvas.background || '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        requestAnimationFrame(drawFrame)
      }
      img.src = url
    }
    
    requestAnimationFrame(drawFrame)
  }

  // Define Header action bar
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/40 shrink-0">
      <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
        <Sparkles size={16} className="text-purple-400" /> Canvas Preview
      </h2>
      <div className="flex items-center gap-2">
        <select 
          value={exportDuration} 
          onChange={(e) => setExportDuration(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
          disabled={isExporting}
          className="glass-input text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
        >
          <option value="auto" className="bg-zinc-900">Auto</option>
          <option value="5" className="bg-zinc-900">5s</option>
          <option value="10" className="bg-zinc-900">10s</option>
          <option value="15" className="bg-zinc-900">15s</option>
          <option value="20" className="bg-zinc-900">20s</option>
          <option value="25" className="bg-zinc-900">25s</option>
          <option value="30" className="bg-zinc-900">30s</option>
        </select>
        <button 
          disabled={!animationData || isExporting}
          onClick={exportVideo}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-30 transition-colors border border-white/5"
        >
          {isExporting ? <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" /> : <Download size={14} />}
          {isExporting ? 'Encoding...' : 'Export Video'}
        </button>
      </div>
    </div>
  )

  if (status === 'error') {
    return (
      <div className="flex flex-col h-full bg-zinc-900/20">
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400 shadow-xl shadow-rose-500/10">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="text-zinc-200 font-medium mb-2">Generation Failed</p>
            <p className="text-sm text-zinc-500 max-w-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col h-full bg-zinc-900/20">
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="w-[600px] max-w-full aspect-video bg-zinc-800/20 rounded-2xl border border-white/5 overflow-hidden relative shadow-2xl">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              <p className="text-sm font-medium text-purple-400 animate-pulse">Orchestrating shapes...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!animationData) {
    return (
      <div className="flex flex-col h-full bg-zinc-900/20">
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 text-zinc-400">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-1">Canvas is empty</p>
            <p className="text-xs text-zinc-500 max-w-xs">Describe an animation on the left and hit Generate to see the magic happen.</p>
          </div>
        </div>
      </div>
    )
  }

  const { canvas, elements } = animationData

  return (
    <div className="flex flex-col h-full bg-zinc-900/20">
      {renderHeader()}
      
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAnv37v3/n0QwDMQpoBiNR+EokOQ2QAEAhT4Kj3xT0bYAAAAASUVORK5CYII=')]">
        <div className="relative group shadow-2xl shadow-purple-900/20 rounded-xl overflow-hidden border border-white/10 transition-transform duration-500 hover:scale-[1.01]" style={{ width: '100%', maxWidth: canvas.width, aspectRatio: `${canvas.width}/${canvas.height}` }}>
          <svg
            ref={svgRef}
            id="animation-svg"
            viewBox={`0 0 ${canvas.width} ${canvas.height}`}
            className="w-full h-full block"
            style={{ background: canvas.background || '#0a0a0a' }}
          >
            {elements.map(renderElement)}
          </svg>
        </div>
      </div>

      {/* Playback Controls Footer */}
      <div className="shrink-0 p-4 border-t border-white/5 bg-zinc-950/70 backdrop-blur-md flex flex-col gap-3">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">
            {(timelineRef.current?.time() || 0).toFixed(1)}s
          </span>
          <div className="flex-1 relative flex items-center h-4 cursor-pointer group">
            <input
              type="range" min="0" max="100" step="0.1"
              value={progress}
              onChange={handleScrub}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            {/* Custom Range Track */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Custom Range Thumb */}
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow border-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
              style={{ left: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono w-8">
            {(timelineRef.current?.duration() || 0).toFixed(1)}s
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={restart}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-white/5"
          >
            <RotateCcw size={14} />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-white text-zinc-900 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function renderElement(el) {
  if (el.type === 'circle') return <circle key={el.id} id={el.id} cx={el.x} cy={el.y} r={el.radius || 30} fill={el.fill || '#fff'} opacity={el.opacity ?? 1} />
  if (el.type === 'rect') return <rect key={el.id} id={el.id} x={el.x} y={el.y} width={el.width || 80} height={el.height || 80} fill={el.fill || '#fff'} opacity={el.opacity ?? 1} rx={8} />
  if (el.type === 'text') return <text key={el.id} id={el.id} x={el.x} y={el.y} fill={el.fill || '#fff'} fontSize={el.fontSize || 24} opacity={el.opacity ?? 1} fontFamily="Inter, sans-serif" fontWeight="600">{el.content || ''}</text>
  return null
}

function buildGsapVars(anim) {
  const ease = anim.ease || 'power2.inOut'
  const duration = anim.duration || 1
  const repeat = anim.repeat ?? 0
  const yoyo = anim.yoyo || false
  const toBase = { duration, ease, repeat, yoyo }

  if (anim.type === 'move') {
    const fromVars = {}, toVars = { ...toBase }
    if (anim.from) {
      if (anim.from.x !== undefined) fromVars.attr = { ...fromVars.attr, cx: anim.from.x, x: anim.from.x }
      if (anim.from.y !== undefined) fromVars.attr = { ...fromVars.attr, cy: anim.from.y, y: anim.from.y }
    }
    if (anim.to) {
      if (anim.to.x !== undefined) toVars.attr = { ...toVars.attr, cx: anim.to.x, x: anim.to.x }
      if (anim.to.y !== undefined) toVars.attr = { ...toVars.attr, cy: anim.to.y, y: anim.to.y }
    }
    return { from: fromVars, to: toVars }
  }
  if (anim.type === 'fade') return { from: { opacity: anim.from?.opacity ?? 0 }, to: { ...toBase, opacity: anim.to?.opacity ?? 1 } }
  if (anim.type === 'scale') return { from: { scaleX: anim.from?.scaleX ?? 1, scaleY: anim.from?.scaleY ?? 1 }, to: { ...toBase, scaleX: anim.to?.scaleX ?? 1, scaleY: anim.to?.scaleY ?? 1, transformOrigin: '50% 50%' } }
  if (anim.type === 'rotate') return { from: { rotation: anim.from?.rotation ?? 0 }, to: { ...toBase, rotation: anim.to?.rotation ?? 360, transformOrigin: '50% 50%' } }
  if (anim.type === 'color') return { from: { attr: { fill: anim.from?.fill || '#ffffff' } }, to: { ...toBase, attr: { fill: anim.to?.fill || '#000000' } } }
  return { from: {}, to: toBase }
}
