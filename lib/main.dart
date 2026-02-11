import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';
import 'services/revenue_cat_service.dart';

// ==========================================
// CONFIGURATION HELPER
// ==========================================
String _getEnv(String key, [String? fallbackKey]) {
  String value = String.fromEnvironment(key);
  if (value.isEmpty && fallbackKey != null) {
    value = String.fromEnvironment(fallbackKey);
  }
  // Strip quotes if CI adds them
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
final String _supabaseKey = _getEnv('SUPABASE_ANON_KEY', 'SUPABASE_KEY');
final String _rcGoogleKey = _getEnv('RC_GOOGLE_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // VALIDATION
  bool isMissing(String val) => val.isEmpty;
  bool isNotExpanded(String val) => val.startsWith('\$');

  // We only BLOCK startup if critical keys (Supabase/Gemini) are broken.
  // We allow RevenueCat to fail gracefully so you can at least use the app.
  bool criticalError = isMissing(_supabaseUrl) || isNotExpanded(_supabaseUrl) ||
                       isMissing(_supabaseKey) || isNotExpanded(_supabaseKey) ||
                       isMissing(_geminiKey) || isNotExpanded(_geminiKey);

  if (criticalError) {
    runApp(const ConfigErrorApp());
    return;
  }

  // 1. Initialize Supabase (Critical)
  try {
    await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseKey);
  } catch (e) {
    print("Supabase Init Error: $e");
    // If Supabase crashes, we might show error app or let it crash
  }

  // 2. Initialize RevenueCat (Non-Critical, will log warning if missing)
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

    // Safety check: Supabase might not be initialized if main failed silently
    final client = Supabase.instance.client;
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

class ConfigErrorApp extends StatelessWidget {
  const ConfigErrorApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Collect status of all keys
    final status = <String, String>{};
    
    void check(String keyName, String val) {
      if (val.isEmpty) {
        status[keyName] = "MISSING (Empty)";
      } else if (val.startsWith('\$')) {
        status[keyName] = "FAILED (Not Expanded)";
      } else {
        status[keyName] = "OK (${val.substring(0, val.length > 4 ? 4 : 1)}...)";
      }
    }

    check('GEMINI_API_KEY', _getEnv('GEMINI_API_KEY'));
    check('SUPABASE_URL', _getEnv('SUPABASE_URL'));
    check('SUPABASE_ANON_KEY', _getEnv('SUPABASE_ANON_KEY'));
    check('RC_GOOGLE_KEY', _getEnv('RC_GOOGLE_KEY'));

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              const Icon(Icons.error_outline, size: 60, color: Colors.red),
              const SizedBox(height: 20),
              const Text(
                'Setup Required',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const Text(
                'Codemagic has the keys, but they are not being passed to the app.',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
              const SizedBox(height: 30),
              
              const Text(" DIAGNOSTIC REPORT:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              const Divider(),
              ...status.entries.map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(
                      e.value.startsWith('OK') ? Icons.check_circle : Icons.cancel,
                      color: e.value.startsWith('OK') ? Colors.green : Colors.red,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text('${e.key}: ', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Expanded(child: Text(e.value, style: TextStyle(color: e.value.startsWith('OK') ? Colors.green : Colors.red))),
                  ],
                ),
              )),
              const Divider(),
              
              const SizedBox(height: 30),
              const Text(
                'HOW TO FIX IN CODEMAGIC:',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFC9A24D)),
              ),
              const SizedBox(height: 10),
              const Text('1. Go to "App settings" -> "Build" -> "Android".'),
              const Text('2. Find the "Build arguments" box.'),
              const Text('3. Paste this exact line:'),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)),
                child: const SelectableText(
                  '--dart-define=GEMINI_API_KEY=\$GEMINI_API_KEY --dart-define=SUPABASE_URL=\$SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=\$SUPABASE_ANON_KEY --dart-define=RC_GOOGLE_KEY=\$RC_GOOGLE_KEY',
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