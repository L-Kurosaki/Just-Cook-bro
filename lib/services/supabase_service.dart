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

  // --- RECIPE MANAGEMENT (CLOUD SYNC) ---

  // Get My Recipes (Private + Public that I created)
  Stream<List<Recipe>> getMyRecipesStream() {
    final uid = _supabase.auth.currentUser?.id;
    if (uid == null) return Stream.value([]);

    return _supabase
        .from('recipes')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid) 
        .order('created_at', ascending: false)
        .map((data) => data.map((json) {
           return Recipe.fromJson(json);
        }).toList())
        .handleError((e) {
           print("Error fetching my recipes: $e");
           return <Recipe>[];
        });
  }

  // Create or Update a Recipe in Cloud
  Future<void> saveRecipe(Recipe recipe) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception("Must be logged in");
    
    final isPremium = await RevenueCatService().isPremium();

    final recipeJson = recipe.toJson();
    
    // Ensure critical fields for cloud
    final data = {
      'id': recipe.id,
      'user_id': user.id, 
      'title': recipe.title,
      'content': recipeJson,
      'author_id': user.id,
      'author_name': user.userMetadata?['full_name'] ?? 'Chef',
      'author_is_premium': isPremium,
      'is_public': recipe.isPublic, 
      'caption': recipe.description,
      'created_at': DateTime.now().toIso8601String(),
    };

    try {
      // Upsert: Insert if new, Update if exists
      await _supabase.from('recipes').upsert(data);
    } on PostgrestException catch (e) {
      // Self-healing: if columns missing
      if (e.code == 'PGRST204') {
         if (e.message.contains('author_is_premium')) {
            data.remove('author_is_premium');
            await _supabase.from('recipes').upsert(data);
         }
      } else {
        rethrow;
      }
    }
  }

  Future<void> deleteRecipe(String recipeId) async {
    await _supabase.from('recipes').delete().eq('id', recipeId);
  }

  // --- COMMUNITY FEED (FETCH) ---

  Future<void> shareRecipeToCommunity(Recipe recipe, String caption, {List<SpotifyTrack>? musicSession}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception("Must be logged in");

    final publicVersion = recipe.copyWith(isPublic: true);
    final isPremium = await RevenueCatService().isPremium();
    final recipeJson = publicVersion.toJson();
    if (musicSession != null) {
      recipeJson['musicSession'] = musicSession.map((e) => e.toJson()).toList();
    }

    final data = {
      'id': recipe.id,
      'user_id': user.id, 
      'content': recipeJson,
      'author_id': user.id,
      'author_name': user.userMetadata?['full_name'] ?? 'Chef',
      'author_is_premium': isPremium, 
      'is_public': true,
      'caption': caption,
      'created_at': DateTime.now().toIso8601String(),
    };

    await _supabase.from('recipes').upsert(data);
  }

  // CHANGED: Use Future instead of Stream to avoid Realtime config issues
  Future<List<Map<String, dynamic>>> getCommunityFeed() async {
    try {
      final response = await _supabase
          .from('recipes')
          .select()
          .eq('is_public', true)
          .order('created_at', ascending: false); // Newest first
          
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print("Error loading feed: $e");
      return [];
    }
  }

  // --- INTERACTIONS & NOTIFICATIONS ---

  Future<void> notifyAuthor(String targetUserId, String type, String message) async {
    final user = _supabase.auth.currentUser;
    if (user == null || user.id == targetUserId) return; // Don't notify self

    final triggerName = user.userMetadata?['full_name'] ?? 'Someone';
    
    final data = {
        'user_id': targetUserId, 
        'type': type, 
        'message': message, 
        'trigger_user': triggerName, 
        'created_at': DateTime.now().toIso8601String(),
        'is_read': false,
    };

    try {
      await _supabase.from('notifications').insert(data);
    } catch (e) {
      // Ignore if table missing
    }
  }
  
  Stream<List<AppNotification>> getNotificationsStream() {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return Stream.value([]);

    return _supabase
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .map((data) => data.map((e) => AppNotification.fromJson(e)).toList())
        .handleError((e) => <AppNotification>[]);
  }

  Future<void> addCommentOrRating(String recipeId, String recipeAuthorId, int rating, String? comment) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    final userName = user.userMetadata?['full_name'] ?? 'Chef';

    try {
      final data = await _supabase.from('recipes').select('comments').eq('id', recipeId).single();
      List current = data['comments'] ?? [];

      final newInteraction = {
        'user_id': user.id,
        'user_name': userName,
        'rating': rating,
        'comment': comment ?? "",
        'date': DateTime.now().toIso8601String(),
      };
      
      current.add(newInteraction);
      
      // CALCULATE AVERAGE
      double totalRating = 0;
      int count = 0;
      for (var r in current) {
         if (r['rating'] != null) {
            totalRating += (r['rating'] as num).toDouble();
            count++;
         }
      }
      int average = count > 0 ? (totalRating / count).round() : 0;

      // Update both comments array AND the main rating column
      await _supabase.from('recipes').update({
        'comments': current,
        'rating': average
      }).eq('id', recipeId);

      String notifMsg = "rated your recipe $rating stars";
      if (comment != null && comment.isNotEmpty) {
        notifMsg += " and commented: \"$comment\"";
      }
      
      await notifyAuthor(recipeAuthorId, 'review', notifMsg);
    } catch (e) {
      print("Error adding comment: $e");
    }
  }
}
