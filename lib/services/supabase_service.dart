import 'package:supabase_flutter/supabase_flutter.dart';
import '../models.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  final _supabase = Supabase.instance.client;

  bool get isAuthenticated => _supabase.auth.currentUser != null;
  String? get userId => _supabase.auth.currentUser?.id;

  Future<void> signIn(String email, String password) async {
    await _supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signUp(String email, String password, String name, String phone) async {
    await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': name, 'phone': phone},
    );
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  // Recipes
  Future<List<Recipe>> getPublicRecipes() async {
    // Mocking public recipes if table doesn't exist or is empty for demo
    try {
      final response = await _supabase.from('recipes').select().eq('is_public', true).limit(50);
      return (response as List).map((e) => Recipe.fromJson(e['content'])).toList();
    } catch (e) {
      // Fallback to mock data if Supabase isn't fully set up with tables
      return [
        Recipe(
          title: 'Spicy Basil Chicken',
          description: 'A quick Thai-inspired stir fry.',
          prepTime: '10 min',
          cookTime: '15 min',
          servings: 2,
          ingredients: [],
          steps: [],
          imageUrl: 'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=800',
          isPublic: true,
          author: 'Chef Alex',
        ),
        Recipe(
          title: 'Creamy Mushroom Risotto',
          description: 'Rich, earthy, and perfectly creamy.',
          prepTime: '20 min',
          cookTime: '40 min',
          servings: 4,
          ingredients: [],
          steps: [],
          imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
          isPublic: true,
          author: 'Maria C.',
        )
      ];
    }
  }
}
