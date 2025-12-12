import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.rebelion16.nusantaraai',
    appName: 'Nusantara AI',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0a0f1d',
            showSpinner: false,
        },
    },
    android: {
        allowMixedContent: true,
    }
};

export default config;
