import { View, type StyleProp, type ViewStyle } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { useTranslation } from '@/i18n';

/**
 * A query failed and there is nothing cached to show. Network, timeout and signed-out failures keep their own wording;
 * only the generic one uses `title` ("Couldn't load budgets").
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
  const { t } = useTranslation('finance');
  const kind = errorKindFromError(error);
  const message =
    kind === 'network'
      ? t('errors.refresh.network')
      : kind === 'timeout'
        ? t('errors.refresh.timeout')
        : kind === 'sessionExpired'
          ? t('errors.refresh.session')
          : t('errors.refresh.message');
  return <ErrorState size="inline" error={error} title={t('errors.refresh.title')} message={message} onRetry={onRetry} retrying={retrying} style={style} />;
}

/** Nothing cached and the request is waiting for a connection. */
export function OfflineState({ description, onRetry }: { description: string; onRetry: () => void }) {
  const { t } = useTranslation('finance');
  return (
    <View>
      <EmptyState variant="offline" description={description} actionTitle={t('actions.tryAgain')} onAction={onRetry} />
    </View>
  );
}
