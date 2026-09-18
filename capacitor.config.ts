import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kirillgames.casino',
  appName: 'KirillGames',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  android: {
    backgroundColor: '#120623'
  }
};

export default config;
