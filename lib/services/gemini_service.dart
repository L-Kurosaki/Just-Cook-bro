import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:http/http.dart' as http;
import '../models.dart';

// ==========================================
// API KEY CONFIGURATION
// ==========================================
// Option 1: Use --dart-define (Secure)
const String _apiKey = String.fromEnvironment('API_KEY');

// Option 2: Hardcode for testing (Uncomment below and paste key)
// const String _apiKey = "AIzaSyYourActualKeyHere...";

const String _openAiKey = String.fromEnvironment('OPENAI_API_KEY', defaultValue: '');

class GeminiService {
  late final GenerativeModel _model;
  late final GenerativeModel _visionModel;

  GeminiService() {
    if (_apiKey.isEmpty) {
      print("⚠️ WARNING: GEMINI_API_KEY is missing. AI features will fail.");
      print("   -> Set it via --dart-define=API_KEY=... or hardcode it in lib/services/gemini_service.dart");
    }
    
    // Using gemini-1.5-flash as it is the current standard production model. 
    // Use 'gemini-1.5-pro' for complex reasoning.
    _model = GenerativeModel(model: 'gemini-1.5-flash', apiKey: _apiKey);
    _visionModel = GenerativeModel(model: 'gemini-1.5-flash', apiKey: _apiKey);
  }

  // --- Helpers ---
  
  Future<dynamic> _callOpenAI(String system, String user, {bool jsonMode = true}) async {
    if (_openAiKey.isEmpty) throw Exception('OpenAI Fallback failed: No API Key');
    
    final response = await http.post(
      Uri.parse('https://api.openai.com/v1/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_openAiKey',
      },
      body: jsonEncode({
        'model': 'gpt-4o',
        'messages': [
          {'role': 'system', 'content': system},
          {'role': 'user', 'content': user}
        ],
        'response_format': jsonMode ? {'type': 'json_object'} : null,
      }),
    );

    if (response.statusCode != 200) throw Exception('OpenAI Error: ${response.body}');
    final data = jsonDecode(response.body);
    final content = data['choices'][0]['message']['content'];
    return jsonMode ? jsonDecode(content) : content;
  }

  String _cleanJson(String text) {
    return text.replaceAll('```json', '').replaceAll('```', '').trim();
  }

  // --- Core Features ---

  Future<Recipe> generateRecipeFromText(String prompt) async {
    if (_apiKey.isEmpty) throw Exception("API Key is missing. Check gemini_service.dart");

    final schema = jsonEncode({
      "title": "String",
      "description": "String",
      "prepTime": "String",
      "cookTime": "String",
      "servings": "Number",
      "ingredients": [{"name": "String", "amount": "String", "category": "String"}],
      "steps": [{"instruction": "String", "timeInSeconds": "Number", "tip": "String", "warning": "String"}]
    });

    try {
      final content = [Content.text('Create a recipe for: "$prompt". Return strict JSON: $schema')];
      final response = await _model.generateContent(content);
      final text = response.text;
      if (text == null) throw Exception("Empty AI response");
      
      final data = jsonDecode(_cleanJson(text));
      data['imageUrl'] = 'https://picsum.photos/800/600'; // Placeholder
      return Recipe.fromJson(data);
    } catch (e) {
      print('Gemini failed: $e');
      throw Exception("Failed to generate recipe. Check API Key or Quota.");
    }
  }

  Future<Recipe> extractRecipeFromUrl(String url) async {
    throw UnimplementedError("URL extraction requires a backend proxy or advanced scraping tools.");
  }

  Future<List<dynamic>> findGroceryStores(String ingredient, double lat, double lng) async {
    // Basic mock implementation as Google Maps grounding requires specific setup
    await Future.delayed(const Duration(seconds: 1));
    return [
      {'name': 'SuperMart', 'address': '123 Main St'},
      {'name': 'Fresh Grocer', 'address': '456 Oak Ave'},
    ];
  }

  Future<String> getCookingHelp(String instruction) async {
    if (_apiKey.isEmpty) return "Keep going, chef! (AI Key missing)";
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
