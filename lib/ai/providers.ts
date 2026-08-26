import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'

export interface LLMResult {
  text: string
  model: string
}

export function cleanJsonText(rawResponse: string): string {
  let cleaned = rawResponse.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  return cleaned.trim()
}

export async function generateWithGemini(prompt: string): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const modelName = 'gemini-2.5-flash'
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  })

  const text = response.text || ''
  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  return {
    text: cleanJsonText(text),
    model: `gemini/${modelName}`,
  }
}

export async function generateWithGroq(prompt: string): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const modelName = 'llama-3.3-70b-versatile'
  const groq = new Groq({ apiKey })

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a JSON restructuring assistant. Always reply strictly with valid JSON without markdown formatting.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: modelName,
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0]?.message?.content || ''
  if (!text) {
    throw new Error('Empty response from Groq')
  }

  return {
    text: cleanJsonText(text),
    model: `groq/${modelName}`,
  }
}
