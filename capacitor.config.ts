import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.aiheaven.app',
  appName: 'AI Heaven',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'https://ais-dev-3akprr5cwy775swhpvqbqo-355977231344.asia-southeast1.run.app',
      'https://ais-pre-3akprr5cwy775swhpvqbqo-355977231344.asia-southeast1.run.app',
      '*.run.app',
      '*.google.com',
      '*.googleapis.com',
      '*.github.com'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080B10'
    }
  }
};

export default config;
