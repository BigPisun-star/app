import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.biotracker.app',
  appName: 'BioTracker',
  webDir:  'dist',

  server: {
    androidScheme: 'https',
  },

  android: {
    allowMixedContent:           false,
    captureInput:                true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
