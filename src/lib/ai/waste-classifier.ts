// @ts-nocheck
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY;

export type WasteClassification = {
  wasteType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  estimatedQuantity: string;
  confidence: number;
  suggestedTitle: string;
  suggestedDescription: string;
  isWaste: boolean;
  spamScore: number;
};

const MOCK_RESPONSE: WasteClassification = {
  wasteType: "Mixed Solid Waste",
  severity: "High",
  estimatedQuantity: "Estimated 15–20 kg",
  confidence: 0.87,
  suggestedTitle: "Garbage dump accumulation — urgent cleanup required",
  suggestedDescription:
    "A significant accumulation of mixed solid waste including plastic bags, organic debris, and cardboard was detected at this location. The waste appears to have been left unattended for several days, posing a health and hygiene risk to the surrounding community.",
  isWaste: true,
  spamScore: 0.05,
};

export async function classifyWasteImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<WasteClassification> {
  const isMock =
    !geminiApiKey ||
    geminiApiKey === "YOUR_GEMINI_API_KEY_HERE" ||
    geminiApiKey.startsWith("YOUR_");

  if (isMock) {
    await new Promise((r) => setTimeout(r, 1200));
    return MOCK_RESPONSE;
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an AI waste detection and verification system for an Indian civic complaint platform.

Analyze this image and determine:
1. Whether the image actually contains waste, garbage, or an environmental hazard.
2. If it is waste, classify it in detail.

Return ONLY valid JSON in this exact format:
{
  "isWaste": true,
  "wasteType": "Type of waste (e.g. Mixed Solid Waste, Plastic Waste, Organic Waste, E-Waste, Construction Debris, Industrial Waste)",
  "severity": "Low | Medium | High | Critical",
  "estimatedQuantity": "Estimated weight/volume (e.g. 5-10 kg, Small pile, Large dump)",
  "confidence": 0.92,
  "spamScore": 0.05,
  "suggestedTitle": "Short, factual complaint title (10-15 words)",
  "suggestedDescription": "Detailed description of the waste issue (2-3 sentences, professional tone, suitable for a government complaint)"
}

If the image does NOT appear to contain waste (e.g. random object, selfie, blank image), return:
{
  "isWaste": false,
  "wasteType": "",
  "severity": "Low",
  "estimatedQuantity": "",
  "confidence": 0.1,
  "spamScore": 0.95,
  "suggestedTitle": "",
  "suggestedDescription": ""
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    let text = result.response.text();
    if (text.startsWith("```json")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (text.startsWith("```")) {
      text = text.replace(/```/g, "").trim();
    }

    return JSON.parse(text) as WasteClassification;
  } catch (error) {
    console.error("Waste classifier error, using mock:", error);
    return MOCK_RESPONSE;
  }
}
