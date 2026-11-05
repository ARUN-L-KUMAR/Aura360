import { apiStream } from '@/lib/api';

import type { PendingAction, ToolTrace } from './types';

export type StreamEvent =
  | { type: 'tool_call_started'; tool: string; args: unknown }
  | { type: 'tool_call_result'; tool: string }
  | { type: 'pending_action'; action: PendingAction }
  | { type: 'text_delta'; delta: string }
  | { type: 'done'; reply: string; trace: ToolTrace[]; pendingAction?: PendingAction }
  | { type: 'error'; message: string };

export type ChatRequest = {
  messages: { role: 'user' | 'model'; content: string }[];
  model: string;
  /** Set to run an action the user just approved. */
  confirm?: { tool: string; args: Record<string, unknown> };
};

/**
 * Sends a chat request and reports each server-sent event as it arrives.
 * Resolves when the stream ends; `cancel()` stops reading early (the server finishes on its own).
 */
export async function streamChat(request: ChatRequest, onEvent: (event: StreamEvent) => void, control?: { cancelled: boolean }) {
  const response = await apiStream('/api/ai/chat', {
    method: 'POST',
    body: {
      messages: request.messages,
      model: request.model,
      confirm: request.confirm,
      stream: true,
      pageContext: { module: 'mobile app', pageTitle: 'Ask Aura (mobile chat)' },
    },
  });

  // Servers without the agent enabled answer with plain JSON instead of a stream.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream') || !response.body) {
    const data = (await response.json()) as { reply?: string; trace?: ToolTrace[]; pendingAction?: PendingAction };
    onEvent({ type: 'done', reply: data.reply ?? '', trace: data.trace ?? [], pendingAction: data.pendingAction });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (name: string, raw: string) => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    switch (name) {
      case 'tool_call_started':
        onEvent({ type: 'tool_call_started', tool: String(payload.tool), args: payload.args });
        break;
      case 'tool_call_result':
        onEvent({ type: 'tool_call_result', tool: String(payload.tool) });
        break;
      case 'pending_action':
        onEvent({ type: 'pending_action', action: payload as unknown as PendingAction });
        break;
      case 'text_delta':
        onEvent({ type: 'text_delta', delta: String(payload.delta ?? '') });
        break;
      case 'done':
        onEvent({
          type: 'done',
          reply: String(payload.reply ?? ''),
          trace: (payload.trace as ToolTrace[]) ?? [],
          pendingAction: payload.pendingAction as PendingAction | undefined,
        });
        break;
      case 'error':
        onEvent({ type: 'error', message: String(payload.message ?? 'Error processing the AI request') });
        break;
    }
  };

  const handleChunk = (chunk: string) => {
    let name = 'message';
    let data = '';
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (data) dispatch(name, data);
  };

  while (true) {
    if (control?.cancelled) {
      await reader.cancel().catch(() => {});
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    chunks.forEach(handleChunk);
  }
  if (buffer.trim()) handleChunk(buffer);
}
