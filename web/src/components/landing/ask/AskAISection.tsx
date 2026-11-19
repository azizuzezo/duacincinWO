import { API_URL } from "@/lib/site";

import { AskAI } from "./AskAI";

/** Whether the assistant is configured on the server (AI_* env set). Cached
 * for a minute; any failure hides it, so the landing never shows a box
 * that can not answer. */
export async function fetchAskEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/ai/status`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    return ((await res.json()) as { enabled?: boolean }).enabled === true;
  } catch {
    return false;
  }
}

export function AskAISection({ enabled }: { enabled: boolean }) {
  return enabled ? <AskAI /> : null;
}
