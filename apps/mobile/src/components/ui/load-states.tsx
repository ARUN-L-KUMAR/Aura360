import { View, type StyleProp, type ViewStyle } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { useTranslation } from '@/i18n';

/**
 * A query failed and there is nothing cached to show. Network, timeout and signed-out failures keep their own wording;
 * only the generic one uses `title` ("Could not load notes").
 */
export function LoadError({
  error,
  title,
  onRetry,
  retrying,
  size,
  style,
}: {
  error: unknown;
  title: string;
  onRetry: () => void;
  retrying?: boolean;
  size?: 'full' | 'inline';
  style?: StyleProp<ViewStyle>;
}) {
  const kind = errorKindFromError(error);
  return <ErrorState error={error} title={kind === 'generic' ? title : undefined} onRetry={onRetry} retrying={retrying} size={size} style={style} />;
}

/** A refresh failed but older data is on screen: a compact row above the content with a retry. */
export function RefreshError({ error, onRetry, retrying, style }: { error: unknown; onRetry: () => void; retrying?: boolean; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation('common');
  const kind = errorKindFromError(error);
  const message =
    kind === 'network'
      ? t('loadStates.refreshNetwork')
      : kind === 'timeout'
        ? t('loadStates.refreshTimeout')
        : kind === 'sessionExpired'
          ? t('loadStates.refreshSession')
          : t('loadStates.refreshMessage');
  return <ErrorState size="inline" error={error} title={t('loadStates.refreshTitle')} message={message} onRetry={onRetry} retrying={retrying} style={style} />;
}

/** Nothing cached and the request is waiting for a connection. */
export function OfflineState({ description, onRetry }: { description: string; onRetry: () => void }) {
  const { t } = useTranslation('common');
  return (
    <View>
      <EmptyState variant="offline" description={description} actionTitle={t('actions.retry')} onAction={onRetry} />
    </View>
  );
}

/** True while a query has nothing cached and is paused waiting for a connection (so a skeleton would never end). */
export function isWaitingForNetwork(query: { isPending: boolean; fetchStatus: string }) {
  return query.isPending && query.fetchStatus === 'paused';
}
