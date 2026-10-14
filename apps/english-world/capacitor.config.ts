import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liulin.englishworld',
  appName: 'English World',
  webDir: 'dist-ios',
  loggingBehavior: 'none',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#F2F2F7',
  },
  plugins: {
    // URLSession owns the HttpOnly login cookie. Do not expose it to JavaScript.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
