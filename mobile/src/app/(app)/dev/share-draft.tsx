import { Redirect, useLocalSearchParams } from 'expo-router';

import { PREVIEW } from '@/preview/flag';
import { shareDraftFor } from '@/preview/seed-share';

/**
 * Developer-only (development builds and `npm run preview:web`): `/dev/share-draft?name=failed|unknown|income` opens the
 * Finance transaction form the way a shared payment screenshot does, so its warnings and duplicate notice can be looked
 * at without a phone. It hands the draft to the real form as the `draft` route param, exactly as the import screen does.
 */
export default function ShareDraftPreview() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const draft = __DEV__ || PREVIEW ? shareDraftFor(name) : null;
  if (!draft) return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/finance/transaction', params: { draft: JSON.stringify(draft) } }} />;
}
