import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json()
    if (!userInput?.trim()) {
      return NextResponse.json({ error: 'userInput required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const isMock = !apiKey || apiKey.startsWith('YOUR_')

    if (isMock) {
      return NextResponse.json({ fallback: true })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `You are an AI civic assistant for Indian cities. The citizen says:

"${userInput}"

Classify the intent:
- "complaint": Reporting a civic issue (kachra, pothole, light, drain, water, etc.)
- "locate_dustbin": Asking for nearest dustbin or recycling point
- "educational": Asking how to recycle, compost, or handle waste at home
- "track_complaint": Asking about status of a filed complaint
- "reward_balance": Asking about their points or reward balance
- "general": Anything else

Return ONLY valid JSON (no markdown):
{
  "intentType": "complaint",
  "category": "Waste Management",
  "severity": "High",
  "authority": "Jabalpur Municipal Corporation",
  "authorityContact": "1533",
  "complaintLetter": "Formal letter...",
  "emailDraft": "Subject: ...\\n\\nBody...",
  "tweetDraft": "@nagarnigam Tweet text under 280 chars #CleanCity",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "estimatedResolutionTime": "3-5 working days",
  "relatedDepartments": ["Dept 1", "Dept 2"],
  "extractedLocation": "Civil Lines, Ward 12",
  "extractedWasteType": "Plastic Waste",
  "extractedQuantity": "Estimated 10 kg",
  "educationalAnswer": "For educational intent: full structured guide in markdown. Empty string otherwise.",
  "dustbinsList": [
    {"name":"Nagar Nigam Smart Bin","type":"Dry Waste (Blue)","location":"Sector 12 Crossing","distance":"200m","lat":23.168,"lng":79.933},
    {"name":"Compost Bin","type":"Wet Waste (Green)","location":"Park Gate","distance":"400m","lat":23.164,"lng":79.928}
  ]
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[/api/ai/assistant] Error:', error)
    return NextResponse.json({ fallback: true })
  }
}
