import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { signAnalysisPayload } from '@/lib/auth/token'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, category, severity } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY
    const isMock = !apiKey || apiKey.startsWith('YOUR_')

    if (isMock || !imageBase64) {
      return NextResponse.json({
        isValid: true,
        isDirectPhoto: true,
        isScreenshot: false,
        isVideoFrame: false,
        isCivicIssue: true,
        category: category || 'Garbage Accumulation',
        detectedIssue: category || 'Garbage Accumulation',
        severity: severity || 'High',
        confidence: 0.94,
        reason: 'Large accumulation of waste is clearly visible in a public area.',
        suggestedAction: 'Municipal waste collection and site clearance required',
        disposalInstruction: 'Segregate dry recyclables and schedule immediate municipal bin pickup.',
        fallback: true,
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a practical, intelligent automated civic issue validator and classifier for municipal administration (CivicPulse – AI-Powered Civic Management Platform).

Your goal is to evaluate if this image provides acceptable evidence of a real-world civic/municipal issue.

EVALUATION PIPELINE:

GATE 1 — SOURCE & AUTHENTICITY CHECK:
- Accept genuine real-world photographs showing public or community issues (on streets, roadsides, pavements, building exteriors, drains, alleys, public areas). Even if the background is plain (like a concrete wall, pavement, or floor), if it shows real physical waste or damage, ACCEPT IT as a valid photo.
- Mark isScreenshot: true ONLY if there are obvious screen/media indicators: YouTube/video player progress bars, play buttons, TV news tickers/channel logos, mobile OS status bars, browser frames, or social media UI.
- Mark isStockOrStaged: true ONLY if it is an obvious pure 3D digital render, cartoon/clip-art, or isolated commercial studio stock graphic on an artificial pure digital background.

GATE 2 — CIVIC RELEVANCE CHECK:
- Does this image clearly show a civic or public infrastructure problem?
  Supported categories: "Garbage Accumulation", "Pothole", "Drainage Blockage", "Water Leakage", "Broken Road", "Street Light Issue", "Illegal Dumping", "Other".
- If the image depicts domestic pets/animals, personal selfies, meals/food, bedroom interiors, laptops/electronics, car dashboards, or unrelated personal items, mark isCivicIssue: false.

GATE 3 — CLASSIFICATION & CONFIDENCE:
- If acceptable civic evidence: return category, severity ("Low" | "Medium" | "High" | "Critical"), confidence (0.00 to 1.00), reason, and actionable municipal remediation.
- If rejected: return category: null, severity: null, and specify rejectionType:
  * "SCREENSHOT_OR_MEDIA" — for video frames, YouTube grabs, social media posts, TV captures.
  * "STOCK_OR_STAGED" — for artificial 3D renders or digital stock graphics.
  * "UNRELATED_CONTENT" — for pets, selfies, food, gadgets, home furniture.
  * "UNREADABLE_IMAGE" — for pitch-black, blank, or unrecognizable images.

Return ONLY valid JSON matching this exact structure with NO markdown formatting:

{
  "isDirectPhoto": true or false,
  "isScreenshot": true or false,
  "isStockOrStaged": true or false,
  "isCivicIssue": true or false,
  "rejectionType": "SCREENSHOT_OR_MEDIA" | "STOCK_OR_STAGED" | "UNRELATED_CONTENT" | "UNREADABLE_IMAGE" | null,
  "category": "Garbage Accumulation" | "Pothole" | "Drainage Blockage" | "Water Leakage" | "Broken Road" | "Street Light Issue" | "Illegal Dumping" | "Other" | null,
  "severity": "Low" | "Medium" | "High" | "Critical" | null,
  "confidence": 0.92,
  "reason": "1-2 sentence concise explanation of what is seen and why accepted or rejected.",
  "suggestedAction": "Brief municipal remediation required (or null if rejected)",
  "disposalInstruction": "Remediation or disposal instructions (or null if rejected)"
}`

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
    ])

    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({
        isValid: false,
        isDirectPhoto: false,
        isScreenshot: false,
        isStockOrStaged: false,
        isCivicIssue: false,
        rejectionType: 'UNREADABLE_IMAGE',
        category: null,
        detectedIssue: null,
        severity: null,
        confidence: 0.5,
        reason: 'Unable to analyze image structure. Please upload a clearer photo.',
        suggestedAction: null,
        disposalInstruction: null,
        fallback: true,
      })
    }

    // Strict validation rules
    const isAuthentic = !parsed.isScreenshot && !parsed.isStockOrStaged && parsed.isDirectPhoto !== false
    const isCivic = parsed.isCivicIssue === true
    const conf = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85

    if (!isAuthentic || !isCivic || conf < 0.75) {
      parsed.isValid = false
      parsed.category = null
      parsed.detectedIssue = null
      parsed.severity = null
      parsed.suggestedAction = null
      parsed.disposalInstruction = null
      if (!parsed.rejectionType) {
        if (parsed.isScreenshot) parsed.rejectionType = 'SCREENSHOT_OR_MEDIA'
        else if (parsed.isStockOrStaged) parsed.rejectionType = 'STOCK_OR_STAGED'
        else if (!isCivic) parsed.rejectionType = 'UNRELATED_CONTENT'
        else if (conf < 0.75) parsed.rejectionType = 'UNREADABLE_IMAGE'
      }
    } else {
      // Valid genuine civic photo
      parsed.isValid = true
      parsed.rejectionType = null
      parsed.detectedIssue = parsed.category
      
      const allowedSeverities = ['Low', 'Medium', 'High', 'Critical']
      if (parsed.severity && !allowedSeverities.includes(parsed.severity)) {
        parsed.severity = 'Medium'
      }

      // Generate server-signed HMAC verification token
      parsed.verificationToken = signAnalysisPayload({
        isValid: true,
        category: parsed.category,
        severity: parsed.severity,
        confidence: conf,
        timestamp: Date.now(),
      })
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[/api/ai/analyze] Error:', error)
    return NextResponse.json({
      isValid: false,
      isDirectPhoto: false,
      isScreenshot: false,
      isVideoFrame: false,
      isCivicIssue: false,
      category: null,
      detectedIssue: null,
      severity: null,
      confidence: 0.5,
      reason: 'AI service temporarily unavailable. Please retry or upload a clearer photo.',
      suggestedAction: null,
      disposalInstruction: null,
      fallback: true,
    })
  }
}
