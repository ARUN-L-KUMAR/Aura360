import { Stack, useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/ui/coming-soon';
import { modules, type ModuleKey } from '@/features/modules';

/** Placeholder for modules that don't have a native screen yet (replaced one by one as they are built). */
export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const info = modules[slug as ModuleKey];

  if (!info) return <ComingSoon module={{ ...modules.notes, label: 'Not found', blurb: 'This section does not exist.' }} />;

  return (
    <>
      <Stack.Screen options={{ title: info.label }} />
      <ComingSoon module={info} />
    </>
  );
}
