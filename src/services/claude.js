const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY_STORAGE_KEY = 'zzp_claude_api_key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasApiKey() {
  return !!getApiKey();
}

export async function callClaude({ messages, system, maxTokens = 2048, tools }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[claude] No API key configured');
    return null;
  }

  const body = { model: CLAUDE_MODEL, max_tokens: maxTokens, messages };
  if (system) body.system = system;
  if (tools?.length) body.tools = tools;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[claude] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text || null;
  } catch (e) {
    console.error('[claude] Network error:', e);
    return null;
  }
}
