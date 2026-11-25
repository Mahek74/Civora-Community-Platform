import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { customArea } = await req.json()
    if (!customArea?.trim()) {
      return NextResponse.json({ error: 'customArea is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const isMock = !apiKey || apiKey.startsWith('YOUR_')

    if (isMock) {
      return NextResponse.json({ fallback: true })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `Predict garbage accumulation risk for the area: "${customArea}" in an Indian city. Return ONLY valid JSON (no markdown):
{"area":"${customArea}","ward":"Ward X","riskPercentage":75,"riskLevel":"High","predictedDays":4,"factors":["High density","Multiple food stalls"],"recommendation":"Deploy additional vehicle and install 3 new bins","wasteTypes":["Food waste","Plastic"],"weather":"Hot and humid","populationDensity":"High density","upcomingFestivals":"Check local calendar","historicalComplaintsCount":8}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[/api/ai/predict] Error:', error)
    return NextResponse.json({ fallback: true })
  }
}
