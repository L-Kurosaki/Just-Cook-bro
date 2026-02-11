import 'dart:convert';
import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models.dart';

String _getEnv(String key, String fallbackValue, {String? altKey}) {
  String value = String.fromEnvironment(key);
  if ((value.isEmpty || value.startsWith('\$')) && altKey != null) {
    value = String.fromEnvironment(altKey);
  }
  if (value.isEmpty || value.startsWith('\$')) {
    return fallbackValue;
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1);
  }
  return value;
}

// Added support for 'key' which is what you named it in Codemagic
final String _apiKey = _getEnv('GEMINI_API_KEY', 'AIzaSyA4wudATZ2vLf3s-OaZKEEBBv37z7jjnaA', altKey: 'key');

class GeminiService {
  late final GenerativeModel _model;
  late final GenerativeModel _visionModel;

  GeminiService() {
    if (_apiKey.isEmpty) {
      print("⚠️ WARNING: GEMINI_API_KEY is missing.");
    }
    // gemini-1.5-flash is performant and cheap
    _model = GenerativeModel(model: 'gemini-1.5-flash', apiKey: _apiKey);
    _visionModel = GenerativeModel(model: 'gemini-1.5-flash', apiKey: _apiKey);
  }

  String _cleanJson(String text) {
    return text.replaceAll('```json', '').replaceAll('```', '').trim();
  }

  String _buildPreferencePrompt(UserProfile? profile) {
    if (profile == null) return "";
    String p = "";
    if (profile.dietaryPreferences.isNotEmpty) {
      p += " IMPORTANT: The user follows these diets: ${profile.dietaryPreferences.join(', ')}. Ensure the recipe strictly adheres to them.";
    }
    if (profile.allergies.isNotEmpty) {
      p += " IMPORTANT: The user is ALLERGIC to: ${profile.allergies.join(', ')}. Do NOT include these ingredients.";
    }
    return p;
  }

  final _recipeSchema = jsonEncode({
    "title": "String",
    "description": "String",
    "prepTime": "String",
    "cookTime": "String",
    "servings": "Number",
    "author": "String",
    "ingredients": [{"name": "String", "amount": "String", "category": "String"}],
    "steps": [{"instruction": "String", "timeInSeconds": "Number", "tip": "String", "warning": "String"}],
    "tags": ["String (e.g. Vegan, Keto, Spicy)"],
    "allergens": ["String (e.g. Nuts, Dairy, Gluten) - List any potential allergens present"]
  });

  // --- Recipe Generation ---

  Future<Recipe> generateRecipeFromText(String prompt, {UserProfile? profile}) async {
    if (_apiKey.isEmpty) throw Exception("API Key is missing.");

    String fullPrompt = 'Create a recipe for: "$prompt".';
    
    if (prompt.toLowerCase().contains('http')) {
      fullPrompt = 'Analyze this link/video: "$prompt". Extract the recipe from the title, captions, or context. '
          'If it is a video, use the title to infer the recipe. ';
    } 

    fullPrompt += _buildPreferencePrompt(profile);
    fullPrompt += ' Return strict JSON: $_recipeSchema. Set "author" to "AI Chef".';

    try {
      final content = [Content.text(fullPrompt)];
      final response = await _model.generateContent(content);
      final text = response.text;
      if (text == null) throw Exception("Empty AI response");
      
      final data = jsonDecode(_cleanJson(text));
      return _processRecipeResponse(data);
    } catch (e) {
      print('Gemini failed: $e');
      throw Exception("Failed to generate recipe. Please try again.");
    }
  }

  // --- Image to Recipe Flow ---

  Future<List<String>> generateOptionsFromImage(Uint8List imageBytes) async {
    final prompt = 'Look at this food image. Suggest exactly 6 specific, distinct recipe names that could represent this dish. Return ONLY a JSON array of strings. Example: ["Dish A", "Dish B"]';
    
    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart('image/jpeg', imageBytes),
      ])
    ];

    try {
      final response = await _visionModel.generateContent(content);
      final text = response.text ?? '[]';
      final List<dynamic> list = jsonDecode(_cleanJson(text));
      return list.map((e) => e.toString()).toList();
    } catch (e) {
      return ["Recipe Idea 1", "Recipe Idea 2", "Recipe Idea 3"]; 
    }
  }

  Future<Recipe> generateRecipeFromOption(String selectedOption, Uint8List imageBytes, {UserProfile? profile}) async {
    String prompt = 'Generate a detailed recipe for "$selectedOption" based on the provided image. '
        'Ensure the "author" field references "Visual AI".';
    
    prompt += _buildPreferencePrompt(profile);
    prompt += ' Return strict JSON: $_recipeSchema';

    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart('image/jpeg', imageBytes),
      ])
    ];

    final response = await _visionModel.generateContent(content);
    final text = response.text;
    if (text == null) throw Exception("Empty AI response");

    final data = jsonDecode(_cleanJson(text));
    return _processRecipeResponse(data, imageUrlOverride: 'https://loremflickr.com/800/600/food,${selectedOption.replaceAll(' ', '')}');
  }

  // --- Helpers ---

  Recipe _processRecipeResponse(Map<String, dynamic> data, {String? imageUrlOverride}) {
      List<dynamic> ingredients = data['ingredients'] ?? [];
      for (var ing in ingredients) {
        ing['imageUrl'] = _getIngredientImageUrl(ing['name']);
      }
      data['imageUrl'] = imageUrlOverride ?? 'https://loremflickr.com/800/600/food,dish';
      return Recipe.fromJson(data);
  }

  String _getIngredientImageUrl(String ingredientName) {
    final cleanName = ingredientName.split(' ').last; 
    return 'https://loremflickr.com/100/100/$cleanName,food';
  }

  Future<List<dynamic>> findGroceryStores(String ingredient, double lat, double lng) async {
    await Future.delayed(const Duration(seconds: 1));
    return [
      {'name': 'Whole Foods Market', 'address': '1.2 miles away • Open'},
      {'name': 'Trader Joe\'s', 'address': '2.5 miles away • Open'},
      {'name': 'Local Farmers Market', 'address': '3.0 miles away • Closes soon'},
    ];
  }

  Future<String> getCookingHelp(String instruction) async {
    try {
      final response = await _model.generateContent([
        Content.text('Cooking step: "$instruction". Give a short, funny or encouraging tip (max 15 words).')
      ]);
      return response.text ?? 'You got this!';
    } catch (e) {
      return 'Keep going, chef!';
    }
  }
}