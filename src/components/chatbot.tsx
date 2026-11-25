'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Mic, MessageSquare, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Add type declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function FloatingWasteChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello 👋 मैं Ecobot हूँ! Ask me anything about waste segregation, e-waste, composting, recycling, or government schemes." }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<any>(null)

  // Load canvas-confetti only on client
  useEffect(() => {
    import('canvas-confetti').then((module) => {
      confettiRef.current = module.default
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const isHindi = (text: string) => /[\u0900-\u097F]/.test(text)

  const handleVoiceInput = () => {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognitionConstructor) {
        toast.error('Speech recognition is not supported in this browser.')
        return
      }
      const recognition = new SpeechRecognitionConstructor()
      recognition.lang = 'hi-IN'
      recognition.start()
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        handleSend(transcript)
      }
    }

  const handleSend = async (msg?: string) => {
    const messageText = msg ?? input
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: messageText.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')

    setIsLoading(true)
    setIsTyping(true)
    setError('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })
      const data = await res.json()
      let aiText = data.reply || "Thank you for asking! I'm here to help you learn about waste management."

      // Enhance with quick waste tips if applicable
      aiText = generateWasteReply(messageText, aiText)

      const assistantMessage: Message = { role: 'assistant', content: aiText }
      setMessages(prev => [...prev, assistantMessage])

      const utterance = new SpeechSynthesisUtterance(aiText)
      utterance.lang = isHindi(messageText) ? 'hi-IN' : 'en-US'
      speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('Chatbot API error, falling back to local handler:', err)
      let aiText = "Thank you for asking! I'm here to help you learn about waste management. Try asking about plastic, wet waste, e-waste, composting, or government schemes."
      aiText = generateWasteReply(messageText, aiText)
      const assistantMessage: Message = { role: 'assistant', content: aiText + " (Fallback Mode)" }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const generateWasteReply = (inputText: string, aiText: string) => {
    const text = inputText.toLowerCase()
    if (/plastic|प्लास्टिक/.test(text)) return isHindi(inputText) ? "प्लास्टिक को 🔵 नीले बिन में डालें।" : "Dispose plastics in the 🔵 Blue Recyclable Bin."
    if (/wet|organic|food|गीला|कचरा/.test(text)) return isHindi(inputText) ? "गीला/ऑर्गेनिक कचरा → 🟢 ग्रीन बिन → घर पर कंपोस्ट करें।" : "Wet waste (food/veg) → 🟢 Green Bin → compostable at home."
    if (/ewaste|battery|mobile|electronics|ई-वेस्ट/.test(text)) return isHindi(inputText) ? "ई-वेस्ट (बैटरी, मोबाइल, इलेक्ट्रॉनिक्स) → अधिकृत ई-वेस्ट केंद्र में जमा करें।" : "E-waste (batteries, mobiles, electronics) → drop at authorized e-waste collection centers."
    if (/compost|कंपोस्ट/.test(text)) return isHindi(inputText) ? "रसोई कचरे को 20–30 दिन में कंपोस्ट करें, मिट्टी और सूक्ष्मजीव का प्रयोग करें।" : "You can compost kitchen waste at home in 20–30 days using a simple bin with soil & microbes."
    if (/scheme|swachh|योजना/.test(text)) return isHindi(inputText) ? "स्वच्छ भारत मिशन योजनाओं के लिए देखें: https://swachhbharatmission.gov.in" : "Check Swachh Bharat Mission schemes here: https://swachhbharatmission.gov.in"
    if (/carbon|climate|environment|कार्बन|जलवायु|पर्यावरण/.test(text)) return isHindi(inputText) ? "सही तरीके से कचरा अलग करने से CO₂ उत्सर्जन कम होता है 🌍!" : "Proper segregation reduces CO₂ emissions 🌍, equivalent to planting trees!"
    return aiText
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white shadow-lg transform hover:scale-110 transition"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
            <h2 className="text-white font-bold text-base">CivicPulse Assistant 🤖</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto h-72 space-y-2 bg-slate-950/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-xl max-w-[75%] break-words text-sm ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-sm' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && <div className="italic text-slate-400 text-xs px-1">Typing...</div>}
            {error && <div className="text-red-400 text-center text-xs">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/80 border-t border-slate-800">
            {['Plastic', 'Wet Waste', 'E-waste', 'Compost', 'Schemes'].map((item) => (
              <button
                key={item}
                onClick={() => handleSend(item)}
                className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold hover:bg-emerald-500/25 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Input + Voice */}
          <div className="p-2.5 border-t border-slate-800 flex items-center space-x-2 bg-slate-900">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              className="flex-1 px-3 py-2 border border-slate-700 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleVoiceInput}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSend()}
              className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
