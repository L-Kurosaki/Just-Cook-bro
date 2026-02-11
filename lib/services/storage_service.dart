import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';
import 'revenue_cat_service.dart';

class StorageService {
  static const String _recipesKey = 'jcb_recipes';
  static const String _foldersKey = 'jcb_folders';
  static const String _profileKey = 'jcb_profile';
  static const String _deleteCountKey = 'jcb_delete_count'; // Track number of deletions

  // --- Recipes ---

  Future<List<Recipe>> getRecipes() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_recipesKey);
    if (data == null) return [];
    
    final List<dynamic> jsonList = jsonDecode(data);
    return jsonList.map((e) => Recipe.fromJson(e)).toList();
  }

  Future<bool> saveRecipe(Recipe recipe) async {
    final isPremium = await RevenueCatService().isPremium();
    final recipes = await getRecipes();

    // Limit check for basic users
    if (!isPremium && recipes.length >= 10 && !recipes.any((r) => r.id == recipe.id)) {
      return false; // Limit reached
    }
    
    final prefs = await SharedPreferences.getInstance();
    
    // Update or Add
    final index = recipes.indexWhere((r) => r.id == recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      recipes.insert(0, recipe);
    }
    
    await prefs.setString(_recipesKey, jsonEncode(recipes.map((e) => e.toJson()).toList()));
    return true;
  }

  Future<bool> deleteRecipe(String id) async {
    final isPremium = await RevenueCatService().isPremium();
    final prefs = await SharedPreferences.getInstance();

    if (!isPremium) {
      int deleteCount = prefs.getInt(_deleteCountKey) ?? 0;
      if (deleteCount >= 1) {
        return false; // Cannot delete consistently
      }
      // Increment delete count
      await prefs.setInt(_deleteCountKey, deleteCount + 1);
    }

    final recipes = await getRecipes();
    recipes.removeWhere((r) => r.id == id);
    await prefs.setString(_recipesKey, jsonEncode(recipes.map((e) => e.toJson()).toList()));
    return true;
  }

  Future<bool> canAddRecipe() async {
    final isPremium = await RevenueCatService().isPremium();
    if (isPremium) return true;
    
    final recipes = await getRecipes();
    return recipes.length < 10;
  }

  // --- Folders ---

  Future<List<Folder>> getFolders() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_foldersKey);
    if (data == null) return [];
    
    final List<dynamic> jsonList = jsonDecode(data);
    return jsonList.map((e) => Folder.fromJson(e)).toList();
  }

  Future<void> createFolder(String name) async {
    final prefs = await SharedPreferences.getInstance();
    final folders = await getFolders();
    folders.add(Folder(name: name));
    await prefs.setString(_foldersKey, jsonEncode(folders.map((e) => e.toJson()).toList()));
  }

  // --- Profile ---

  Future<UserProfile> getProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_profileKey);
    if (data == null) return UserProfile();
    return UserProfile.fromJson(jsonDecode(data));
  }

  Future<void> saveProfile(UserProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileKey, jsonEncode(profile.toJson()));
  }
}