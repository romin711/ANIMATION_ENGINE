import React, { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import AnimationCanvas from './components/AnimationCanvas.jsx'
import { generateAnimation } from './services/animationService.js'

function App() {
  const [animationData, setAnimationData] = useState(null)
  const [status, setStatus] = useState('idle') 
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])

  const handleGenerate = async (promptData) => {
    // Construct enriched prompt merging user text and explicitly selected visual controls
    const constraints = `Speed: ${promptData.speed}, Preferred Shape: ${promptData.shape}, Primary Color: ${promptData.color}, Duration: ~${promptData.duration}s`;
    const fullDescription = `${promptData.description}. Follow these constraints exactly: ${constraints}.`;
    
    setStatus('loading')
    setErrorMessage('')
    setAnimationData(null) // Reset canvas for loading state
    
    try {
      const data = await generateAnimation(fullDescription)
      setAnimationData(data.animation)
      setStatus('success')
      // Save generation to history
      setHistory(prev => [{ prompt: promptData.description, data: data.animation, id: Date.now() }, ...prev])
    } catch (err) {
      const message = err.response?.data?.details
        ? JSON.stringify(err.response.data.details)
        : err.message || 'Something went wrong.'
      setErrorMessage(message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen text-slate-200 relative overflow-hidden" style={{ background: '#09090b' }}>
      {/* Background Ambient Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      {/* Main Layout Layer */}
      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        <TopNav status={status} />
        
        <main className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6 max-w-[1600px] mx-auto w-full">
          {/* Left Panel: Settings & Prompts */}
          <section className="w-[380px] flex-shrink-0 flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl">
             <ControlPanel 
                onGenerate={handleGenerate} 
                status={status} 
                history={history} 
                onSelectHistory={(item) => setAnimationData(item.data)} 
             />
          </section>

          {/* Right Panel: Preview Engine */}
          <section className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden shadow-2xl relative">
             <AnimationCanvas animationData={animationData} status={status} errorMessage={errorMessage} />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
