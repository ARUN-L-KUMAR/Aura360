import { memo } from 'react';
import { View } from 'react-native';

import { Illustration } from '@/components/illustrations/illustration';
import type { SceneName } from '@/illustrations/registry';
import { spacing } from '@/theme';

/**
 * The three onboarding illustrations: spot scenes from the art pipeline (src/illustrations/scenes/spot), each themed
 * with the app palette and gently animated. All are decorative and hidden from screen readers; the slide's headline
 * and text carry the meaning.
 */

/** Widest the artwork gets (tablets); on phones it fills the slide. */
const ART_MAX_WIDTH = spacing.xxxl * 7;

function Scene({ scene }: { scene: SceneName }) {
  return (
    <View style={{ width: '100%', maxWidth: ART_MAX_WIDTH }}>
      <Illustration scene={scene} accent="ai" />
    </View>
  );
}

/** Slide 1: the assistant hub with the six everyday modules orbiting it. */
export const OrbitIllustration = memo(function OrbitIllustration() {
  return <Scene scene="onboarding-everything" />;
});

/** Slide 2: a short chat, Aura answering a question. */
export const ChatIllustration = memo(function ChatIllustration() {
  return <Scene scene="onboarding-ask" />;
});

/** Slide 3: a phone that keeps working while the cloud is away, with a sync badge. */
export const OfflineIllustration = memo(function OfflineIllustration() {
  return <Scene scene="onboarding-offline" />;
});
