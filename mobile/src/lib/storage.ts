import * as SecureStore from 'expo-secure-store';

// SecureStore keys may only contain letters, digits, ".", "-" and "_".
const KEYS = {
  access: 'aura.accessToken',
  refresh: 'aura.refreshToken',
  user: 'aura.user',
  server: 'aura.serverUrl',
  theme: 'aura.theme',
  biometrics: 'aura.biometrics',
} as const;

export type StoredUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  workspaceId: string;
};

export type StoredTokens = { accessToken: string | null; refreshToken: string };

async function read(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null) {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Storage can fail on some devices (e.g. keystore reset). The in-memory copy still works
    // for this launch; the user just has to sign in again next time.
  }
}

export const storage = {
  async loadSession() {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      read(KEYS.access),
      read(KEYS.refresh),
      read(KEYS.user),
    ]);
    let user: StoredUser | null = null;
    try {
      user = userJson ? (JSON.parse(userJson) as StoredUser) : null;
    } catch {
      user = null;
    }
    return { accessToken, refreshToken, user };
  },

  async saveTokens(tokens: StoredTokens) {
    await Promise.all([write(KEYS.access, tokens.accessToken), write(KEYS.refresh, tokens.refreshToken)]);
  },

  async saveUser(user: StoredUser) {
    await write(KEYS.user, JSON.stringify(user));
  },

  async clearSession() {
    await Promise.all([write(KEYS.access, null), write(KEYS.refresh, null), write(KEYS.user, null)]);
  },

  getServerUrl: () => read(KEYS.server),
  setServerUrl: (url: string | null) => write(KEYS.server, url),
  getTheme: () => read(KEYS.theme),
  setTheme: (mode: string | null) => write(KEYS.theme, mode),
  getBiometricEnabled: async () => (await read(KEYS.biometrics)) === 'true',
  setBiometricEnabled: (enabled: boolean) => write(KEYS.biometrics, enabled ? 'true' : 'false'),
};
