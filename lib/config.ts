export interface AppConfig {
  googleCloudProject: string;
  geminiApiKey: string;
  geminiModel: string;
  port: number;
}

function getEnvOrThrow(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    googleCloudProject: getEnvOrThrow('GOOGLE_CLOUD_PROJECT', 'local-dev'),
    geminiApiKey: getEnvOrThrow('GEMINI_API_KEY'),
    geminiModel: getEnvOrThrow('GEMINI_MODEL', 'gemini-1.5-flash'),
    port: parseInt(getEnvOrThrow('PORT', '3000'), 10),
  };
}

// Lazy singleton
let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
