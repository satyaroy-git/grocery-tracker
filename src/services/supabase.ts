import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://kirgmrafaurjpegfysnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcmdtcmFmYXVyanBlZ2Z5c25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTg5OTcsImV4cCI6MjA5NzA5NDk5N30.69vPynmI-Qv0861NnaK7y2NbdXNCEh97xVeMoCyA298';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
