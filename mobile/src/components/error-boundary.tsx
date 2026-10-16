import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/ui/error-state';
import { analytics } from '@/lib/telemetry';
import { useTheme } from '@/theme';

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <ErrorState kind="generic" onRetry={onRetry} />
    </View>
  );
}

/**
 * Catches render errors anywhere below it, reports them to telemetry (if the user opted in) and shows a friendly screen
 * with a retry instead of a white screen. Wrap the app root; wrap risky subtrees (e.g. rich-text rendering) the same way.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    analytics.captureException(error, { where: 'render', componentStack: info.componentStack ?? undefined });
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    return this.state.error ? <Fallback onRetry={this.reset} /> : this.props.children;
  }
}
