import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth_screen.dart';
import 'screens/main_screen.dart';
import 'screens/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://placeholder.supabase.co'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'placeholder'),
  );

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
