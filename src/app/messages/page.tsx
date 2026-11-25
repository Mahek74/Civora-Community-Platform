'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError('')

    const newMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, newMessage])
    setInput('')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.content }),
      })
      const data = await res.json()
      const responseText = data.reply || "Proper waste segregation is key! Dispose plastics in dry waste bins and food scrap in compost bins."
      const assistantMessage: Message = { role: 'assistant', content: responseText }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error with API, falling back to mock reply:', err)
      const mockReplies = [
        "Proper waste segregation is key! Dispose plastics in dry waste bins and food scrap in compost bins.",
        "Composting organic waste at home is a great way to enrich soil and save the planet.",
        "E-waste contains harmful chemicals and should only be deposited at authorized recycling collection centers."
      ]
      const responseText = mockReplies[Math.floor(Math.random() * mockReplies.length)]
      const assistantMessage: Message = { role: 'assistant', content: responseText + " (Fallback Mode)" }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-emerald-400">Eco-Chat Assistant</h1>
      
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            Ask any question about waste management, recycling, or environmental tips!
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="text-red-400 mb-2 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about waste management..."
          className="flex-1 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Send
        </button>
      </form>
    </div>
  )
}
