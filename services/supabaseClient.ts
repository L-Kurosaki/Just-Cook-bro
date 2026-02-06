import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SUPABASE_URL = 'https://ltkfrfsowjgrdnqzewah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a2ZyZnNvd2pncmRucXpld2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDg1NzEsImV4cCI6MjA4NTgyNDU3MX0.nki1OGBMkgoXlj-5FO3mD6_TtNgzcnyRNsUZk749KtM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tells Supabase to auto-refresh the token when the app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const isSupabaseConfigured = () => {
  return true;
};
