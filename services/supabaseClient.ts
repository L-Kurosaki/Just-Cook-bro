import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// SECURITY: Use environment variables exclusively.
// On Netlify, ensure 'EXPO_PUBLIC_SUPABASE_URL' and 'EXPO_PUBLIC_SUPABASE_ANON_KEY' are set in Site Settings.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debugging helper for Netlify blank screen issues related to missing env vars
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase Environment Variables are missing! Check Netlify Site Settings.");
}

// Initialize client with fallback to avoid crash, but auth calls will fail if keys are missing.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder', 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured = () => {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://placeholder.supabase.co';
};

// Tells Supabase to auto-refresh the token when the app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});