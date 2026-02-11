import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/gemini_service.dart';
import '../services/storage_service.dart';

class AddRecipeScreen extends StatefulWidget {
  const AddRecipeScreen({super.key});

  @override
  State<AddRecipeScreen> createState() => _AddRecipeScreenState();
}

class _AddRecipeScreenState extends State<AddRecipeScreen> {
  final TextEditingController _textController = TextEditingController();
  final GeminiService _gemini = GeminiService();
  final StorageService _storage = StorageService();
  bool _loading = false;

  Future<void> _generateFromText() async {
    if (_textController.text.isEmpty) return;
    setState(() => _loading = true);
    
    try {
      final recipe = await _gemini.generateRecipeFromText(_textController.text);
      await _storage.saveRecipe(recipe);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Recipe'), backgroundColor: Colors.white, elevation: 0, iconTheme: const IconThemeData(color: Colors.black)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Describe your dish', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            TextField(
              controller: _textController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'e.g. A spicy thai basil chicken stir fry...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: const Color(0xFFF3F4F6),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loading ? null : _generateFromText,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFC9A24D),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(LucideIcons.wand2, color: Colors.white),
              label: Text(_loading ? 'Generating...' : 'Create Recipe', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 40),
            const Text('Or scan an image', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
             const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () {
                 // Integrate Image Picker here
                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera integration requires native configuration. Run on device.')));
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 24),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(LucideIcons.camera, color: Color(0xFFC9A24D), size: 32),
              label: const Text('Take Photo', style: TextStyle(color: Color(0xFF2E2E2E), fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
