import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY || "");

export async function translateToEnglish(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Translate the following farming activity type to English. Provide only the English translation, no extra text.
    Text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Translation error:", error);
    return "";
  }
}
