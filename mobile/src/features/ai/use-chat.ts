import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { ApiError } from '@/lib/api';

import { streamChat, type ChatRequest } from './stream';
import { aiActions, newId, useAiStore } from './threads';
import { toolLabel, type AiMessage, type PendingAction, type ToolTrace } from './types';

const HISTORY_LIMIT = 10;

/** Only real turns go to the model: no blank placeholders or error bubbles. */
function toPayload(messages: AiMessage[]) {
  return messages
    .filter((message) => message.content.trim() && !message.isError)
    .slice(-HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
}

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429) return error.message || 'You have reached the AI usage limit for now. Try again later.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong while talking to Aura.';
}

export function useAiChat() {
  const queryClient = useQueryClient();
  const store = useAiStore();
  const runRef = useRef<{ cancelled: boolean } | null>(null);

  const thread = store.threads.find((t) => t.id === store.activeId) ?? null;
  const busy = !!thread?.messages.some((message) => message.isStreaming);

  /** Streams one assistant reply into `aiId`. */
  const run = useCallback(
    async (threadId: string, aiId: string, request: ChatRequest) => {
      const control = { cancelled: false };
      runRef.current = control;

      let trace: ToolTrace[] = [];
      let pending: PendingAction | undefined;
      let streamedText = '';
      let sawWrite = !!request.confirm;

      const finish = (patch: Partial<AiMessage>) => aiActions.patchMessage(threadId, aiId, { isStreaming: false, activeTool: undefined, ...patch });

      try {
        await streamChat(
          request,
          (event) => {
            switch (event.type) {
              case 'tool_call_started':
                trace = [...trace, { tool: event.tool, args: event.args }];
                if (!event.tool.startsWith('get_')) sawWrite = true;
                aiActions.patchMessage(threadId, aiId, { activeTool: { tool: event.tool, status: 'running', label: toolLabel(event.tool, 'running') }, trace });
                break;
              case 'tool_call_result':
                aiActions.patchMessage(threadId, aiId, { activeTool: { tool: event.tool, status: 'completed', label: toolLabel(event.tool, 'completed') } });
                break;
              case 'pending_action':
                pending = event.action;
                aiActions.patchMessage(threadId, aiId, { pendingAction: event.action, actionStatus: 'pending' });
                break;
              case 'text_delta':
                streamedText += event.delta;
                aiActions.appendToMessage(threadId, aiId, event.delta);
                break;
              case 'done': {
                const action = event.pendingAction ?? pending;
                finish({
                  content: streamedText || event.reply || 'Done.',
                  trace: event.trace.length > 0 ? event.trace : trace,
                  pendingAction: action,
                  actionStatus: action ? 'pending' : undefined,
                });
                break;
              }
              case 'error':
                finish({ content: streamedText || event.message, isError: true });
                break;
            }
          },
          control,
        );
        if (control.cancelled) finish({ content: streamedText || 'Stopped.' });
        // Something may have been created or changed: refresh every list in the app.
        if (sawWrite) void queryClient.invalidateQueries();
      } catch (error) {
        finish({ content: errorText(error), isError: true });
      } finally {
        if (runRef.current === control) runRef.current = null;
      }
    },
    [queryClient],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const threadId = aiActions.ensureActiveThread();
      const existing = store.threads.find((t) => t.id === threadId)?.messages ?? [];
      const now = new Date().toISOString();

      const userMessage: AiMessage = { id: newId(), role: 'user', content, createdAt: now };
      const aiId = newId();
      aiActions.addMessage(threadId, userMessage);
      aiActions.addMessage(threadId, { id: aiId, role: 'model', content: '', createdAt: now, isStreaming: true, trace: [] });

      await run(threadId, aiId, { messages: toPayload([...existing, userMessage]), model: store.model });
    },
    [busy, run, store.model, store.threads],
  );

  const confirmAction = useCallback(
    async (messageId: string) => {
      if (!thread || busy) return;
      const index = thread.messages.findIndex((message) => message.id === messageId);
      const target = thread.messages[index];
      if (!target?.pendingAction) return;

      aiActions.patchMessage(thread.id, messageId, { actionStatus: 'confirmed' });
      const aiId = newId();
      aiActions.addMessage(thread.id, { id: aiId, role: 'model', content: '', createdAt: new Date().toISOString(), isStreaming: true, trace: [] });

      await run(thread.id, aiId, {
        messages: toPayload(thread.messages.slice(0, index + 1)),
        model: store.model,
        confirm: { tool: target.pendingAction.tool, args: target.pendingAction.args },
      });
    },
    [busy, run, store.model, thread],
  );

  const cancelAction = useCallback(
    (messageId: string) => {
      if (thread) aiActions.patchMessage(thread.id, messageId, { actionStatus: 'cancelled' });
    },
    [thread],
  );

  const stop = useCallback(() => {
    if (runRef.current) runRef.current.cancelled = true;
  }, []);

  return { store, thread, busy, send, confirmAction, cancelAction, stop };
}
