import 'dart:io';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  final _supabase = Supabase.instance.client;

  bool get isAuthenticated => _supabase.auth.currentUser != null;
  String? get userId => _supabase.auth.currentUser?.id;
  User? get currentUser => _supabase.auth.currentUser;

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
  
  Future<void> resetPassword(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }

  // --- PROFILE MANAGEMENT ---

  Future<String> getUserName() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return "Chef";
    return user.userMetadata?['full_name'] ?? "Chef";
  }
  
  Future<String?> getUserAvatar() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;
    return user.userMetadata?['avatar_url'];
  }

  Future<void> updateProfile({String? name, String? phone, bool? isPremium}) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['full_name'] = name;
    if (phone != null) updates['phone'] = phone;
    if (isPremium != null) updates['is_premium'] = isPremium;
    
    await _supabase.auth.updateUser(UserAttributes(data: updates));
  }

  Future<void> uploadAvatar(Uint8List bytes) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;
    
    final fileName = '${user.id}/${DateTime.now().millisecondsSinceEpoch}.jpg';
    
    try {
      await _supabase.storage.from('avatars').uploadBinary(
        fileName,
        bytes,
        fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
      );
      
      final imageUrl = _supabase.storage.from('avatars').getPublicUrl(fileName);
      await _supabase.auth.updateUser(UserAttributes(data: {'avatar_url': imageUrl}));
    } catch (e) {
      print("Upload failed: $e. Ensure 'avatars' bucket exists and is public.");
      throw Exception("Failed to upload image. Please check network.");
    }
  }

  // --- COMMUNITY FEED (REAL DATA) ---

  Future<void> shareRecipeToCommunity(Recipe recipe, String caption) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception("Must be logged in");

    // We store the full recipe JSON in a 'content' column
    await _supabase.from('recipes').insert({
      'title': recipe.title,
      'content': recipe.toJson(), // Store full structure
      'author_id': user.id,
      'author_name': user.userMetadata?['full_name'] ?? 'Chef',
      'is_public': true,
      'caption': caption, // New column for user comments
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getCommunityFeed() async {
    try {
      // Fetch public recipes, ordered by newest
      final response = await _supabase
          .from('recipes')
          .select()
          .eq('is_public', true)
          .order('created_at', ascending: false)
          .limit(50);
          
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print("Feed fetch error: $e");
      return [];
    }
  }
}