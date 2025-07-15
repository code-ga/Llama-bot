import { OpenAI } from "openai"
import { API_KEY, BASE_URL } from "../const"

export function getOpenAiClient() {
  return new OpenAI({
    apiKey: API_KEY, baseURL: BASE_URL,
    ...{
      defaultQuery: { "api-version": "2025-03-01-preview" },
      defaultHeaders: { "api-key": API_KEY }
    }
  })
}