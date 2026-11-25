import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { message, systemContext } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const isMock = !apiKey || apiKey.startsWith('YOUR_')

    if (isMock) {
      // Fallback domain responses
      const text = message.toLowerCase()
      let reply = 'Thank you for your civic query! For waste issues, go to Report Issue. For tracking, visit My Complaints.'
      if (/garbage|kachra|waste/.test(text)) reply = 'Please report garbage at /report. Upload a photo, detect GPS location, then AI will classify severity and create a complaint with tracking ID.'
      if (/points|xp|reward/.test(text)) reply = 'Earn XP by: Reporting verified civic issues (+50 XP), completing volunteer cleanups (+100 XP), monthly challenges (+150 XP).'
      if (/track|complaint|civ-/.test(text)) reply = 'Track your complaint at /complaints. The 5 stages are: Reported -> AI Classified -> Admin Verified -> In Progress -> Resolved.'
      if (/volunteer/.test(text)) reply = 'Visit /volunteer/dashboard to adopt cleanup tasks, scan QR on-site, upload before/after photos, and earn +100 XP.'
      if (/dustbin|bin|recycl/.test(text)) reply = 'Nearest bins: Nagar Nigam Smart Bin (Blue/Dry) - Civil Lines Crossing 180m. Wet Waste (Green) - Wright Town Park 340m. E-Waste Hub - Zonal Office 850m.'
      if (/emergency|112|sos|manhole|hazard/.test(text)) reply = 'For urgent civic hazards (open manholes, electrical wires, pipeline bursts), use /sos for high-priority municipal dispatch. For life-threatening emergencies, call 112 immediately.'
      return NextResponse.json({ reply, fallback: true })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const civicPrompt = `You are CivicPulse AI Assistant, a domain-specific civic technology assistant for Indian cities (Jabalpur, MP). 

Your role:
- Help citizens report civic issues (garbage, potholes, drainage, water, lighting)
- Guide on earning XP/reward points in CivicPulse platform
- Explain complaint tracking (5 stages: Reported -> AI Classified -> Admin Verified -> In Progress -> Resolved)
- Help locate nearest dustbins and recycling points
- Guide on volunteer cleanup tasks
- Explain emergency SOS reporting (always clarify it is not a replacement for 112)

Always be concise, helpful, and in the language the user is using.
${systemContext || ''}

User message: "${message}"`

    const result = await model.generateContent(civicPrompt)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[/api/ai/chat] Error:', error)
    return NextResponse.json({ 
      reply: 'I apologize, AI assistant is temporarily unavailable. For urgent civic issues, visit /report or call your municipal helpline.',
      fallback: true 
    })
  }
}
