export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppConfig {
  firebaseConfig: FirebaseConfig;
}

const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'catdex_firebase_config',
};

// Default keys from Vite env
const getEnvConfig = (): AppConfig => {
  return {
    firebaseConfig: {
      apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '',
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
      appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
    },
  };
};

export const getAppConfig = (): AppConfig => {
  const env = getEnvConfig();
  
  // Check local storage overrides
  const localFirebaseConfigStr = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
  
  let localFirebaseConfig: FirebaseConfig | null = null;
  if (localFirebaseConfigStr) {
    try {
      localFirebaseConfig = JSON.parse(localFirebaseConfigStr);
    } catch (e) {
      console.error('Failed to parse local Firebase configuration', e);
    }
  }

  return {
    firebaseConfig: {
      apiKey: localFirebaseConfig?.apiKey || env.firebaseConfig.apiKey,
      authDomain: localFirebaseConfig?.authDomain || env.firebaseConfig.authDomain,
      projectId: localFirebaseConfig?.projectId || env.firebaseConfig.projectId,
      storageBucket: localFirebaseConfig?.storageBucket || env.firebaseConfig.storageBucket,
      messagingSenderId: localFirebaseConfig?.messagingSenderId || env.firebaseConfig.messagingSenderId,
      appId: localFirebaseConfig?.appId || env.firebaseConfig.appId,
    },
  };
};

export const saveAppConfig = (config: AppConfig) => {
  if (
    config.firebaseConfig &&
    config.firebaseConfig.apiKey &&
    config.firebaseConfig.projectId
  ) {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config.firebaseConfig));
  } else {
    localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
  }
};

export const isConfigValid = (config: AppConfig): boolean => {
  const hasFirebase = !!(
    config.firebaseConfig.apiKey &&
    config.firebaseConfig.projectId &&
    config.firebaseConfig.authDomain
  );
  return hasFirebase;
};
