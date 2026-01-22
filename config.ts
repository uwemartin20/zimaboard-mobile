// config.ts

type EnvConfig = {
    APP_ENV: string;
    API_BASE_URL: string;
    PUSHER_APP_KEY: string;
};

// Set your environment here: 'development' or 'production'
const APP_ENV = 'production'; // change only here for dev / prod

const configs: Record<string, EnvConfig> = {
  development: {
    APP_ENV: 'local',
    API_BASE_URL: 'http://localhost:8080/api',
    PUSHER_APP_KEY: '2faa6528d6871c8c8a49',
  },
  production: {
    APP_ENV: 'prod',
    API_BASE_URL: 'http://zimaboard-api.zmwl.local/api',
    PUSHER_APP_KEY: 'e290aec7e9a9b2e47641',
  },
};

export const Config = configs[APP_ENV];