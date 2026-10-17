import { usePathname, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { aiActions } from '@/features/ai/threads';
import { AI_MODELS } from '@/features/ai/types';
import { useAiChat } from '@/features/ai/use-chat';
import { analytics } from '@/lib/telemetry';

import { CONTEXT_PROMPTS, MODULE_NAMES } from './widget-constants';
import { WidgetFab } from './widget-fab';
import { useKeyboardVisible } from './widget-hooks';
import { WidgetSheet } from './widget-sheet';

export { BotIcon } from './widget-icons';

/**
 * Floating Aura assistant, mounted once in the tabs layout.
 * - `WidgetFab`: the draggable collapsed bubble (hidden on the Ask Aura tab, while the keyboard is up, and while the
 *   sheet is open).
 * - `WidgetSheet`: the bottom-docked chat panel (Chat / For You / Drafts).
 * The chat hook lives here so a running reply keeps streaming (and can be stopped) after the sheet closes.
 */
export function FloatingAiWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const keyboardVisible = useKeyboardVisible();
  const [isOpen, setIsOpen] = useState(false);

  const { store, thread, busy, send, confirmAction, cancelAction, stop } = useAiChat();

  // The dedicated Ask Aura tab already is the full chat.
  const isChatTab = pathname?.endsWith('/ai') || (segments as string[]).includes('ai');

  // Which module the user is looking at: used for the panel title and the suggested prompts.
  const currentModuleKey =
    (segments as string[]).find((seg) => typeof seg === 'string' && seg in MODULE_NAMES) ||
    pathname?.split('/').filter(Boolean).pop() ||
    'index';
  const pageTitle = MODULE_NAMES[currentModuleKey] || MODULE_NAMES.index;
  const quickPrompts = CONTEXT_PROMPTS[currentModuleKey] || CONTEXT_PROMPTS.default;

  const modelName = AI_MODELS.find((m) => m.id === store.model)?.name ?? AI_MODELS[0].name;
  // The list is inverted (newest at the bottom), so it is fed newest-first.
  const messages = useMemo(() => [...(thread?.messages ?? [])].reverse(), [thread?.messages]);
  // Actions waiting for the user's approval.
  const drafts = useMemo(
    () => (thread?.messages ?? []).filter((m) => m.pendingAction && m.actionStatus === 'pending'),
    [thread?.messages],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const openFull = useCallback(() => {
    setIsOpen(false);
    router.push('/ai');
  }, [router]);

  const newChat = useCallback(() => {
    if (thread && thread.messages.length === 0) return;
    aiActions.newThread();
  }, [thread]);

  const sendMessage = useCallback(
    (text: string) => {
      void send(text);
      analytics.track('ai_message_sent', { surface: 'widget' });
    },
    [send],
  );

  // The chat hook's confirm / cancel callbacks change on every streamed token. The sheet gets these stable wrappers so
  // the settled messages in its list do not render again while a reply grows.
  const latest = useRef({ confirmAction, cancelAction });
  useEffect(() => {
    latest.current = { confirmAction, cancelAction };
  });
  const onConfirm = useCallback((messageId: string) => void latest.current.confirmAction(messageId), []);
  const onCancel = useCallback((messageId: string) => latest.current.cancelAction(messageId), []);

  return (
    <>
      <WidgetFab hidden={isOpen || isChatTab || keyboardVisible} badge={drafts.length} onOpen={open} />
      <WidgetSheet
        visible={isOpen}
        onClose={close}
        onOpenFull={openFull}
        onNewChat={newChat}
        pageTitle={pageTitle}
        quickPrompts={quickPrompts}
        modelName={modelName}
        messages={messages}
        drafts={drafts}
        busy={busy}
        onSend={sendMessage}
        onStop={stop}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
}
