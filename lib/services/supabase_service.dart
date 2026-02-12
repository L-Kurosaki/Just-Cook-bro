import 'dart:io';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models.dart';
import 'revenue_cat_service.dart';

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

  // --- COMMUNITY FEED (REAL TIME) ---

  Future<void> shareRecipeToCommunity(Recipe recipe, String caption, {List<SpotifyTrack>? musicSession}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception("Must be logged in");

    final isPremium = await RevenueCatService().isPremium();

    final recipeJson = recipe.toJson();
    if (musicSession != null && musicSession.isNotEmpty) {
      recipeJson['musicSession'] = musicSession.map((e) => e.toJson()).toList();
    }

    // Insert with premium status so we can highlight them in the feed
    await _supabase.from('recipes').insert({
      'title': recipe.title,
      'content': recipeJson,
      'author_id': user.id,
      'author_name': user.userMetadata?['full_name'] ?? 'Chef',
      'author_is_premium': isPremium, // NEW: Track if author is gold
      'is_public': true,
      'caption': caption,
      'comments': [], 
      'likes': 0,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Stream<List<Map<String, dynamic>>> getCommunityFeedStream() {
    return _supabase
        .from('recipes')
        .stream(primaryKey: ['id'])
        .eq('is_public', true)
        .order('created_at', ascending: false)
        .map((data) => List<Map<String, dynamic>>.from(data));
  }

  // --- INTERACTIONS & NOTIFICATIONS ---

  Future<void> notifyAuthor(String targetUserId, String type, String message) async {
    final user = _supabase.auth.currentUser;
    if (user == null || user.id == targetUserId) return; // Don't notify self

    final triggerName = user.userMetadata?['full_name'] ?? 'Someone';

    try {
      await _supabase.from('notifications').insert({
        'user_id': targetUserId, // Who gets the alert
        'type': type, // 'save', 'cook', 'review'
        'message': message, // Full message (Frontend decides whether to censor based on Premium)
        'trigger_user': triggerName, // Store who caused it
        'created_at': DateTime.now().toIso8601String(),
        'is_read': false,
      });
    } catch (e) {
      print("Notification error: $e");
    }
  }
  
  // New: Get Notifications for the logged-in user
  Stream<List<AppNotification>> getNotificationsStream() {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return Stream.value([]);

    return _supabase
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .map((data) => data.map((e) => AppNotification.fromJson(e)).toList());
  }

  Future<void> addCommentOrRating(String recipeId, String recipeAuthorId, int rating, String? comment) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    final userName = user.userMetadata?['full_name'] ?? 'Chef';

    // 1. Fetch current comments
    final data = await _supabase.from('recipes').select('comments').eq('id', recipeId).single();
    List current = data['comments'] ?? [];

    // 2. Add new interaction
    final newInteraction = {
      'user_id': user.id,
      'user_name': userName,
      'rating': rating,
      'comment': comment ?? "",
      'date': DateTime.now().toIso8601String(),
    };
    
    current.add(newInteraction);

    // 3. Update DB
    await _supabase.from('recipes').update({'comments': current}).eq('id', recipeId);

    // 4. Notify Author
    // We send the generic message type. The details (like "User X") are handled by notifyAuthor logic
    String notifMsg = "rated your recipe $rating stars";
    if (comment != null && comment.isNotEmpty) {
      notifMsg += " and commented: \"$comment\"";
    }
    
    // Pass the action suffix. The notification screen will reconstruct "TriggerUser + suffix" or "Someone + suffix"
    await notifyAuthor(recipeAuthorId, 'review', notifMsg);
  }
}