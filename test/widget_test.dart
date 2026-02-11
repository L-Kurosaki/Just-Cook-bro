import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:just_cook_bro/screens/auth_screen.dart';

void main() {
  testWidgets('Auth Screen renders correctly', (WidgetTester tester) async {
    // We pump the AuthScreen directly to verify UI elements without initializing 
    // the full Supabase backend connection required by main.dart.
    await tester.pumpWidget(const MaterialApp(home: AuthScreen()));

    // Verify that the title is present
    expect(find.text('Just Cook Bro'), findsOneWidget);
    
    // Verify that Sign In/Sign Up toggle exists
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Sign Up'), findsOneWidget);
    
    // Verify inputs exist
    expect(find.byType(TextField), findsAtLeastNWidgets(2)); // Email + Password
  });
}
