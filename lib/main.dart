import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';
import 'services/revenue_cat_service.dart';

// ==========================================
// CONFIGURATION HELPER
// ==========================================
// Helper to strip quotes if the CI system adds them (common issue)
String _getEnv(String key, [String? fallbackKey]) {
  String value = String.fromEnvironment(key);
  if (value.isEmpty && fallbackKey != null) {
    value = String.fromEnvironment(fallbackKey);
  }
  
  // Strip outer quotes if present (e.g. "KEY" -> KEY)
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
final String _geminiKey = _getEnv('GEMINI_API_KEY', 'API_KEY');
final String _supabaseUrl = _getEnv('SUPABASE_URL');
final String _supabaseKey = _getEnv('SUPABASE_ANON_KEY');
final String _rcGoogleKey = _getEnv('RC_GOOGLE_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // CRITICAL: Check if keys were actually passed during build
  // We check for empty strings AND unexpanded variables (starting with $)
  bool isInvalid(String val) => val.isEmpty || val.startsWith('\$');

  if (isInvalid(_supabaseUrl) || isInvalid(_supabaseKey) || isInvalid(_geminiKey) || isInvalid(_rcGoogleKey)) {
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
    // Determine which keys are missing or broken for the UI
    final errors = <String>[];
    
    void check(String name, String val) {
      if (val.isEmpty) {
        errors.add('$name: MISSING (Value is empty)');
      } else if (val.startsWith('\$')) {
        errors.add('$name: ERROR (Value is "$val")');
      }
    }

    check('SUPABASE_URL', _getEnv('SUPABASE_URL'));
    check('SUPABASE_ANON_KEY', _getEnv('SUPABASE_ANON_KEY'));
    
    String gem = _getEnv('GEMINI_API_KEY');
    if (gem.isEmpty) gem = _getEnv('API_KEY');
    check('GEMINI_API_KEY', gem);

    check('RC_GOOGLE_KEY', _getEnv('RC_GOOGLE_KEY'));

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              const Center(child: Icon(Icons.warning_amber_rounded, size: 80, color: Colors.red)),
              const SizedBox(height: 20),
              const Center(
                child: Text(
                  'Configuration Failed',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'The app failed to load the following API Keys:',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: errors.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('• $e', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 12)),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 24),
              if (errors.any((e) => e.contains('ERROR')))
                const Text(
                  'TIP: "ERROR" means the variable was not expanded. Check that your Environment Variable names in Codemagic exactly match the build arguments.',
                  style: TextStyle(fontStyle: FontStyle.italic, color: Colors.orange),
                ),
              const SizedBox(height: 24),
              const Text('HOW TO FIX (Codemagic UI):', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFC9A24D))),
              const SizedBox(height: 8),
              const Text('1. Go to "App settings" > "Build" > "Flutter build apk".'),
              const Text('2. Find the "Build arguments" field.'),
              const Text('3. Ensure this line is pasted exactly:'),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade300)),
                child: const SelectableText(
                  '--dart-define=GEMINI_API_KEY=\$GEMINI_API_KEY --dart-define=SUPABASE_URL=\$SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=\$SUPABASE_ANON_KEY --dart-define=RC_GOOGLE_KEY=\$RC_GOOGLE_KEY',
                  style: TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}