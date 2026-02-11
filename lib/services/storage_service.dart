import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';

class StorageService {
  static const String _recipesKey = 'jcb_recipes';
  static const String _profileKey = 'jcb_profile';

  Future<List<Recipe>> getRecipes() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_recipesKey);
    if (data == null) return [];
    
    final List<dynamic> jsonList = jsonDecode(data);
    return jsonList.map((e) => Recipe.fromJson(e)).toList();
  }

  Future<void> saveRecipe(Recipe recipe) async {
    final prefs = await SharedPreferences.getInstance();
    final recipes = await getRecipes();
    
    // Update or Add
    final index = recipes.indexWhere((r) => r.id == recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      recipes.insert(0, recipe);
    }
    
    await prefs.setString(_recipesKey, jsonEncode(recipes.map((e) => e.toJson()).toList()));
  }

  Future<void> deleteRecipe(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final recipes = await getRecipes();
    recipes.removeWhere((r) => r.id == id);
    await prefs.setString(_recipesKey, jsonEncode(recipes.map((e) => e.toJson()).toList()));
  }

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
