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
  String value = String.fromEnvironment(key);
  if ((value.isEmpty || value.startsWith('\$')) && altKey != null) {
    value = String.fromEnvironment(altKey);
  }
  if (value.isEmpty || value.startsWith('\$')) {
    return fallbackValue;
  }
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
final String _geminiKey = _getEnv('GEMINI_API_KEY', 'AIzaSyA4wudATZ2vLf3s-OaZKEEBBv37z7jjnaA', altKey: 'key');
final String _supabaseUrl = _getEnv('SUPABASE_URL', 'https://ltkfrfsowjgrdnqzewah.supabase.co', altKey: 'super_base_url');
final String _supabaseKey = _getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a2ZyZnNvd2pncmRucXpld2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDg1NzEsImV4cCI6MjA4NTgyNDU3MX0.nki1OGBMkgoXlj-5FO3mD6_TtNgzcnyRNsUZk749KtM', altKey: 'super_base_key');
final String _rcGoogleKey = _getEnv('RC_GOOGLE_KEY', 'test_BekbchnDGoHXuZwUveusGAGnaZc', altKey: 'ARC_google');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
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
    final session = client.auth.currentSession;
    
    // Listen to Premium Status to change the whole app Theme
    return ValueListenableBuilder<bool>(
      valueListenable: RevenueCatService().premiumNotifier,
      builder: (context, isPremium, child) {
        
        // Define Colors based on status
        final primaryColor = isPremium ? const Color(0xFFFFD700) : const Color(0xFFC9A24D); // Gold vs Bronze
        final surfaceTint = isPremium ? const Color(0xFFFFF8E1) : Colors.white;

        return MaterialApp(
          title: 'Just Cook Bro',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
              seedColor: primaryColor,
              primary: primaryColor,
              background: surfaceTint,
              surface: Colors.white,
            ),
            useMaterial3: true,
            scaffoldBackgroundColor: Colors.white,
            fontFamily: 'Inter',
            // Customizing icons globally for premium feel
            iconTheme: IconThemeData(
              color: isPremium ? const Color(0xFFDAA520) : const Color(0xFF2E2E2E),
            ),
            appBarTheme: AppBarTheme(
              iconTheme: IconThemeData(color: isPremium ? const Color(0xFFDAA520) : Colors.black),
            ),
            bottomNavigationBarTheme: BottomNavigationBarThemeData(
              selectedItemColor: isPremium ? const Color(0xFFDAA520) : const Color(0xFFC9A24D),
              unselectedItemColor: Colors.grey,
            )
          ),
          home: session != null ? const MainScreen() : const AuthScreen(),
        );
      }
    );
  }
}
