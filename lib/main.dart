import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';
import 'services/revenue_cat_service.dart';

// ==========================================
// CONFIGURATION
// ==========================================
const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const String _geminiKey = String.fromEnvironment('GEMINI_API_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // CRITICAL: Check if keys were actually passed during build
  if (_supabaseUrl.isEmpty || _supabaseKey.isEmpty || _geminiKey.isEmpty) {
    runApp(const ConfigErrorApp());
    return;
  }

  // 1. Initialize Supabase
  await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseKey);

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

    final session = Supabase.instance.client.auth.currentSession;
    
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

class ConfigErrorApp extends StatelessWidget {
  const ConfigErrorApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Determine which keys are missing for the UI
    final missingKeys = <String>[];
    if (const String.fromEnvironment('SUPABASE_URL').isEmpty) missingKeys.add('SUPABASE_URL');
    if (const String.fromEnvironment('SUPABASE_ANON_KEY').isEmpty) missingKeys.add('SUPABASE_ANON_KEY');
    if (const String.fromEnvironment('GEMINI_API_KEY').isEmpty) missingKeys.add('GEMINI_API_KEY');

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.red.shade50,
        body: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'Configuration Error',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.red),
              ),
              const SizedBox(height: 16),
              const Text(
                'The App was built without the following API Keys:',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              ...missingKeys.map((key) => Text('• $key', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red))),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: const Text(
                  '1. Check Codemagic "Environment variables".\n'
                  '2. Ensure variable names match exactly.\n'
                  '3. If running locally, add keys to .vscode/launch.json.',
                  style: TextStyle(fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}