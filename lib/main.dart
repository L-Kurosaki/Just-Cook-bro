import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';
import 'services/revenue_cat_service.dart';

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
// Option 1: Use --dart-define (Secure)
const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseKey = String.fromEnvironment('SUPABASE_ANON_KEY');

// Option 2: Hardcode for testing (Uncomment below and paste keys)
// const String _supabaseUrl = "https://your-project.supabase.co";
// const String _supabaseKey = "eyJhbGciOiJIUzI1...";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 1. Initialize Supabase
  if (_supabaseUrl.isNotEmpty && _supabaseKey.isNotEmpty) {
    await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseKey);
  } else {
    print("⚠️ WARNING: Supabase keys are missing.");
    print("   -> Set them via --dart-define or hardcode in lib/main.dart");
    await Supabase.initialize(
      url: 'https://placeholder.supabase.co',
      anonKey: 'placeholder',
    );
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

    // Check if Supabase is actually connected before checking session
    final session = _supabaseUrl.isNotEmpty 
        ? Supabase.instance.client.auth.currentSession 
        : null;
    
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
