import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vigilinksos.app',
  appName: 'Vigilink-SOS',
  webDir: 'dist',
  plugins: {
    NativeSMS: {},
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    appendUserAgent: 'Vigilink-SOS',
  },
  server: {
    androidScheme: 'https',
    hostname: 'vigilinksos.app',
  },
};

export default config;
