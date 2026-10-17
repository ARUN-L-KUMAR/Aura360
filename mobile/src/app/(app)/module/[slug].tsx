import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ComingSoon } from '@/components/ui/coming-soon';
import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { modules, type ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';

/** Placeholder for modules that don't have a native screen yet (replaced one by one as they are built). */
export default function ModuleScreen() {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const info = modules[slug as ModuleKey];

  if (!info) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <ErrorState
          kind="notFound"
          title={t('module.notFound.title')}
          message={t('module.notFound.message')}
          onRetry={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: info.label }} />
      <ComingSoon module={info} />
    </>
  );
}
