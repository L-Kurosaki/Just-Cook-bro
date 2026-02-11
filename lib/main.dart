import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';
import 'services/revenue_cat_service.dart';

// ==========================================
// CONFIGURATION HELPER
// ==========================================
String _getEnv(String key, String fallbackValue, {String? altKey}) {
  // 1. Try primary key (Standard naming)
  String value = String.fromEnvironment(key);
  
  // 2. Try alternate key (User's custom naming in Codemagic)
  if ((value.isEmpty || value.startsWith('\$')) && altKey != null) {
    value = String.fromEnvironment(altKey);
  }

  // 3. If still missing, use hardcoded fallback
  if (value.isEmpty || value.startsWith('\$')) {
    print("⚠️ Key '$key'/'$altKey' missing. Using Backup.");
    return fallbackValue;
  }

  // 4. Cleanup quotes if present
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1);
  } else if (value.startsWith("'") && value.endsWith("'")) {
    value = value.substring(1, value.length - 1);
  }
  return value;
}

// ==========================================
// API KEYS
// ==========================================
// We now check for YOUR specific variable names (key, super_base_url, etc)
final String _geminiKey = _getEnv('GEMINI_API_KEY', 'AIzaSyA4wudATZ2vLf3s-OaZKEEBBv37z7jjnaA', altKey: 'key');
final String _supabaseUrl = _getEnv('SUPABASE_URL', 'https://ltkfrfsowjgrdnqzewah.supabase.co', altKey: 'super_base_url');
final String _supabaseKey = _getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a2ZyZnNvd2pncmRucXpld2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDg1NzEsImV4cCI6MjA4NTgyNDU3MX0.nki1OGBMkgoXlj-5FO3mD6_TtNgzcnyRNsUZk749KtM', altKey: 'super_base_key');
final String _rcGoogleKey = _getEnv('RC_GOOGLE_KEY', 'test_BekbchnDGoHXuZwUveusGAGnaZc', altKey: 'ARC_google');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  print("🚀 Starting App with Config:");
  print("Supabase URL: ${_supabaseUrl.isNotEmpty ? 'OK' : 'MISSING'}");
  print("Gemini Key: ${_geminiKey.isNotEmpty ? 'OK' : 'MISSING'}");

  // 1. Initialize Supabase
  try {
    await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseKey);
  } catch (e) {
    print("Supabase Init Error: $e");
  }

  // 2. Initialize RevenueCat
  await RevenueCatService().init();

  runApp(const JustCookBroApp());
}

class JustCookBroApp extends StatefulWidget {
  const JustCookBroApp({super.key});

  @override
  State<JustCookBroApp> createState() => _JustCookBroAppState();
}

class _JustCookBroAppState extends State<JustCookBroApp> {
  bool _showSplash = true;

  @override
  Widget build(BuildContext context) {
    if (_showSplash) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: SplashScreen(onFinish: () => setState(() => _showSplash = false)),
      );
    }

    final client = Supabase.instance.client;
    // Check session safely
    final session = client.auth.currentSession;
    
    return MaterialApp(
      title: 'Just Cook Bro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFC9A24D),
          primary: const Color(0xFFC9A24D),
          background: Colors.white,
          surface: Colors.white,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
        fontFamily: 'Inter',
      ),
      home: session != null ? const MainScreen() : const AuthScreen(),
    );
  }
}