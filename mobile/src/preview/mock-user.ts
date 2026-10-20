import type { StoredUser } from '@/lib/storage';

/** The signed-in user of the preview build. */
export const PREVIEW_USER: StoredUser = {
  id: 'preview-user',
  email: 'arun@example.com',
  name: 'Arun',
  image: null,
  workspaceId: 'preview-workspace',
};
