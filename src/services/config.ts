// Expo SDK 54 renamed the classic file API to expo-file-system/legacy
// (the default `expo-file-system` export is now the new object-oriented API).
import * as FileSystem from 'expo-file-system/legacy';

const CONFIG_FILE = `${FileSystem.documentDirectory}pantrypal_config.json`;

interface AppConfig {
  geminiApiKey?: string;
}

let cachedConfig: AppConfig | null = null;

async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const fileInfo = await FileSystem.getInfoAsync(CONFIG_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(CONFIG_FILE);
      cachedConfig = JSON.parse(content);
      return cachedConfig!;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  cachedConfig = {};
  return cachedConfig;
}

async function saveConfig(config: AppConfig): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(CONFIG_FILE, JSON.stringify(config));
    cachedConfig = config;
  } catch (error) {
    console.error('Failed to save config:', error);
    throw error;
  }
}

export async function getApiKey(): Promise<string | null> {
  const config = await loadConfig();
  return config.geminiApiKey || null;
}

export async function setApiKey(key: string): Promise<void> {
  const config = await loadConfig();
  config.geminiApiKey = key;
  await saveConfig(config);
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 0;
}

export async function clearApiKey(): Promise<void> {
  const config = await loadConfig();
  delete config.geminiApiKey;
  await saveConfig(config);
  cachedConfig = config;
}
