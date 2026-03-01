import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gstreet.trivia',
  appName: 'GStreet Trivia',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#041E42',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#041E42',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
