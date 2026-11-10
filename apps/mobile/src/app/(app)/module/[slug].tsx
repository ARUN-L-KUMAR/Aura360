import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ErrorState } from '@/components/ui/error-state';
import { Screen } from '@/components/ui/screen';
import { modules, type ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';

/** `/module/<slug>` is an old link shape: every module has its own screen now, so it goes there. */
export default function ModuleScreen() {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const info = modules[slug as ModuleKey];

  if (info) return <Redirect href={info.href as Href} />;

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
