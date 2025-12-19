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
        GoogleAuth: {
            scopes: ['profile', 'email'],
            // Web Client ID from Google Cloud Console (OAuth 2.0 Client ID - Web application)
            // Go to: https://console.cloud.google.com/apis/credentials?project=nusantara-ai-18db6
            serverClientId: '959578499658-49oi1q7n6lmrpha4nt0l6nohjjdn9mf3.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
    android: {
        allowMixedContent: true,
    }
};

export default config;

