import { createOpenAI } from "@ai-sdk/openai";

function normalizeBaseURL(baseURL: string | undefined) {
  if (!baseURL) return undefined;
  const trimmed = baseURL.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function getLLMClient() {
  const rawBaseURL = process.env.LLM_BASE_URL;
  const baseURL = normalizeBaseURL(rawBaseURL);
  const apiKey = process.env.LLM_API_KEY || "sk-placeholder";

  return createOpenAI({ baseURL, apiKey });
}

export function getModel() {
  const modelName = process.env.LLM_MODEL || "gpt-4o-mini";
  return getLLMClient().chat(modelName);
}
