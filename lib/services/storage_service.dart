import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';
import 'revenue_cat_service.dart';

class StorageService {
  static const String _recipesKey = 'jcb_recipes';
  static const String _foldersKey = 'jcb_folders';
  static const String _profileKey = 'jcb_profile';
  static const String _deleteCountKey = 'jcb_delete_count'; // Track number of deletions
  static const String _shoppingKey = 'jcb_shopping';

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
    
    // Check if recipe already exists
    final index = recipes.indexWhere((r) => r.id == recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      // Add to top
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

  Future<void> createFolder(String name, {String? parentId}) async {
    final prefs = await SharedPreferences.getInstance();
    final folders = await getFolders();
    folders.add(Folder(name: name, parentId: parentId));
    await prefs.setString(_foldersKey, jsonEncode(folders.map((e) => e.toJson()).toList()));
  }
  
  Future<void> updateFolder(Folder folder) async {
    final prefs = await SharedPreferences.getInstance();
    final folders = await getFolders();
    final index = folders.indexWhere((f) => f.id == folder.id);
    if (index != -1) {
      folders[index] = folder;
      await prefs.setString(_foldersKey, jsonEncode(folders.map((e) => e.toJson()).toList()));
    }
  }

  Future<void> deleteFolder(String id) async {
    final prefs = await SharedPreferences.getInstance();
    List<Folder> folders = await getFolders();
    
    // Remove the folder
    folders.removeWhere((f) => f.id == id);
    
    // Reset recipes in that folder
    List<Recipe> recipes = await getRecipes();
    final updatedRecipes = recipes.map((r) {
      if (r.folderId == id) {
        return Recipe(
          id: r.id,
          title: r.title,
          description: r.description,
          prepTime: r.prepTime,
          cookTime: r.cookTime,
          servings: r.servings,
          ingredients: r.ingredients,
          steps: r.steps,
          imageUrl: r.imageUrl,
          isPremium: r.isPremium,
          isOffline: r.isOffline,
          isPublic: r.isPublic,
          author: r.author,
          sourceUrl: r.sourceUrl,
          rating: r.rating,
          folderId: null, // Clear folder
          tags: r.tags,
          allergens: r.allergens,
        );
      }
      return r;
    }).toList();

    await prefs.setString(_foldersKey, jsonEncode(folders.map((e) => e.toJson()).toList()));
    await prefs.setString(_recipesKey, jsonEncode(updatedRecipes.map((e) => e.toJson()).toList()));
  }

  // --- Shopping List ---

  Future<void> addIngredientsToShop(List<Ingredient> ingredients) async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_shoppingKey);
    List<ShopItem> currentItems = [];
    
    if (data != null) {
      final List<dynamic> json = jsonDecode(data);
      currentItems = json.map((e) => ShopItem.fromJson(e)).toList();
    }

    // Add new ingredients
    for (var ing in ingredients) {
      // Simple logic: add if not exact duplicate text
      final text = "${ing.amount} ${ing.name}";
      if (!currentItems.any((item) => item.text == text)) {
        currentItems.add(ShopItem(id: DateTime.now().millisecondsSinceEpoch.toString() + ing.name, text: text));
      }
    }

    await prefs.setString(_shoppingKey, jsonEncode(currentItems.map((e) => e.toJson()).toList()));
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