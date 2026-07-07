import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://kirgmrafaurjpegfysnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmdtcmFmYXVyanBlZ2Z5c25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTg5OTcsImV4cCI6MjA5NzA5NDk5N30.69vPynmI-Qv0861NnaK7y2NbdXNCEh97xVeMoCyA298';

// Custom storage adapter using expo-secure-store (works in Expo Go, unlike
// @react-native-async-storage/async-storage whose native module is NOT bundled
// in Expo Go for SDK 53+). SecureStore also encrypts the data at rest, which
// is better for auth tokens anyway.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
