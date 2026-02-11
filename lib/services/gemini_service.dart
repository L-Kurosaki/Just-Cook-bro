import 'dart:convert';
import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
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

final String _apiKey = _getEnv('GEMINI_API_KEY', 'AIzaSyA4wudATZ2vLf3s-OaZKEEBBv37z7jjnaA', altKey: 'key');

class GeminiService {
  late final GenerativeModel _model;
  late final GenerativeModel _visionModel;

  GeminiService() {
    _model = GenerativeModel(model: 'gemini-3-flash-preview', apiKey: _apiKey);
    _visionModel = GenerativeModel(model: 'gemini-3-flash-preview', apiKey: _apiKey);
  }

  String _cleanJson(String text) {
    try {
      final startIndex = text.indexOf('{');
      final endIndex = text.lastIndexOf('}');
      if (startIndex != -1 && endIndex != -1) {
        return text.substring(startIndex, endIndex + 1);
      }
    } catch (e) {
      // Fallback
    }
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
    String fullPrompt = 'Create a recipe for: "$prompt".';
    
    if (prompt.toLowerCase().contains('http')) {
      fullPrompt = 'Analyze this link/video: "$prompt". Extract the recipe from the title, captions, or context.';
    } 

    fullPrompt += _buildPreferencePrompt(profile);
    fullPrompt += ' Return strict JSON: $_recipeSchema. Set "author" to "AI Chef". Do not output markdown.';

    try {
      final content = [Content.text(fullPrompt)];
      final response = await _model.generateContent(content);
      final text = response.text;
      if (text == null) throw Exception("Empty AI response");
      
      final cleanText = _cleanJson(text);
      final data = jsonDecode(cleanText);
      return _processRecipeResponse(data);
    } catch (e) {
      print('Gemini failed: $e');
      throw Exception("Failed to generate recipe. Please try again.");
    }
  }

  // --- SAFETY CHECK & VISION ---

  /// STRICT validation to ensure image is food.
  Future<void> _validateImageIsFood(Uint8List imageBytes) async {
    final prompt = "Is this image a food item, a dish, or a cooking ingredient? Answer only YES or NO.";
    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart('image/jpeg', imageBytes),
      ])
    ];

    final response = await _visionModel.generateContent(content);
    final text = response.text?.trim().toUpperCase() ?? "NO";

    if (!text.contains("YES")) {
      throw Exception("Image does not appear to be food. Please upload a valid cooking ingredient or dish.");
    }
  }

  Future<List<String>> generateOptionsFromImage(Uint8List imageBytes) async {
    // 1. Validate Image First
    await _validateImageIsFood(imageBytes);

    // 2. Generate Options
    final prompt = 'Look at this food image. Suggest exactly 6 specific, distinct recipe names that could represent this dish. Return ONLY a JSON array of strings.';
    
    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart('image/jpeg', imageBytes),
      ])
    ];

    try {
      final response = await _visionModel.generateContent(content);
      final text = response.text ?? '[]';
      final cleanText = _cleanJson(text);
      final List<dynamic> list = jsonDecode(cleanText);
      return list.map((e) => e.toString()).toList();
    } catch (e) {
      print("Vision failed: $e");
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

    final cleanText = _cleanJson(text);
    final data = jsonDecode(cleanText);
    return _processRecipeResponse(data, imageUrlOverride: 'https://loremflickr.com/800/600/food,${selectedOption.replaceAll(' ', '')}');
  }

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

  // --- Real Location Services ---

  Future<void> findGroceryStores(String ingredient) async {
    // 1. Get Real Location
    try {
      Position position = await _determinePosition();
      
      // 2. Open Real Google Maps Search
      final query = Uri.encodeComponent("buy $ingredient");
      final googleMapsUrl = Uri.parse("https://www.google.com/maps/search/$query/@${position.latitude},${position.longitude},14z");
      
      if (await canLaunchUrl(googleMapsUrl)) {
        await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not open maps.';
      }
    } catch (e) {
      print("Location error: $e");
      // Fallback search without location
      final query = Uri.encodeComponent("buy $ingredient near me");
      final url = Uri.parse("https://www.google.com/maps/search/$query");
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<Position> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Location permissions are denied');
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return Future.error('Location permissions are permanently denied.');
    }

    return await Geolocator.getCurrentPosition();
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