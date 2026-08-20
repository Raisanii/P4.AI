// P4.AI — 9router AI client wrapper (§7.6, constraint #9).
//
// 9router is an OpenAI-compatible chat completions gateway. This module
// wraps a single `chatCompletion` function using native fetch — no SDK
// dependency needed (Node 18+ / Next.js 15 has global fetch).
//
// Env:
//   AI_API_BASE_URL — OpenAI-compatible base URL (e.g. https://9router/v1)
//   AI_API_KEY      — bearer token
//   AI_MODEL        — model name (default: gpt-4o-mini)
//
// AI proposes, backend decides: the caller validates every AI output
// before storage (§10, constraint #11). If 9router is down or env is
// missing, `chatCompletion` returns null — callers MUST handle with a
// deterministic fallback (risk: "9router down → Retry + fallback").

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
};

/**
 * Call 9router chat completions. Returns the assistant message content,
 * or null if the AI is unavailable / returns an unparseable response.
 * Callers MUST handle null with a deterministic fallback.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<string | null> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
