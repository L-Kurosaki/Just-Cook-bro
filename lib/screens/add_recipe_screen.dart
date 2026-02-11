import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../services/gemini_service.dart';
import '../services/storage_service.dart';
import '../services/revenue_cat_service.dart';
import '../models.dart';
import '../widgets/paywall.dart';

class AddRecipeScreen extends StatefulWidget {
  const AddRecipeScreen({super.key});

  @override
  State<AddRecipeScreen> createState() => _AddRecipeScreenState();
}

class _AddRecipeScreenState extends State<AddRecipeScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final GeminiService _gemini = GeminiService();
  final StorageService _storage = StorageService();
  final RevenueCatService _rc = RevenueCatService();
  
  late TabController _tabController;
  bool _loading = false;
  String _statusMessage = "";
  UserProfile? _userProfile;
  
  // Image Flow State
  Uint8List? _selectedImage;
  List<String> _recipeOptions = [];
  bool _showOptions = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    _userProfile = await _storage.getProfile();
  }

  // --- Logic ---

  Future<void> _checkLimitsAndProceed(Function action) async {
    bool canAdd = await _storage.canAddRecipe();
    if (!canAdd) {
      if (mounted) {
        showModalBottomSheet(context: context, builder: (_) => const Paywall());
      }
    } else {
      action();
    }
  }

  Future<void> _generateFromText() async {
    if (_textController.text.isEmpty) return;
    
    _checkLimitsAndProceed(() async {
      setState(() { _loading = true; _statusMessage = "Analyzing input & Preferences..."; });
      try {
        final recipe = await _gemini.generateRecipeFromText(
          _textController.text, 
          profile: _userProfile
        );
        await _saveAndExit(recipe);
      } catch (e) {
        _showError(e.toString());
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        _selectedImage = bytes;
        _showOptions = false;
        _recipeOptions = [];
      });
      _analyzeImage(bytes);
    }
  }

  Future<void> _analyzeImage(Uint8List bytes) async {
    _checkLimitsAndProceed(() async {
      setState(() { _loading = true; _statusMessage = "Analyzing image..."; });
      try {
        final options = await _gemini.generateOptionsFromImage(bytes);
        setState(() {
          _recipeOptions = options.take(6).toList();
          _showOptions = true;
          _loading = false;
        });
      } catch (e) {
        _showError("Could not identify food.");
        setState(() => _loading = false);
      }
    });
  }

  Future<void> _generateFromOption(String option) async {
    setState(() { _loading = true; _statusMessage = "Chef AI is cooking '$option'..."; });
    try {
      final recipe = await _gemini.generateRecipeFromOption(
        option, 
        _selectedImage!,
        profile: _userProfile
      );
      await _saveAndExit(recipe);
    } catch (e) {
       _showError(e.toString());
       setState(() => _loading = false);
    }
  }

  Future<void> _saveAndExit(Recipe recipe) async {
    bool saved = await _storage.saveRecipe(recipe);
    if (!saved) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Limit Reached. Upgrade to add more.")));
        showModalBottomSheet(context: context, builder: (_) => const Paywall());
      }
    } else {
      if (mounted) Navigator.pop(context);
    }
  }

  void _showError(String err) {
    if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
  }

  // --- UI ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Recipe'),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFC9A24D),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFFC9A24D),
          tabs: const [
            Tab(text: "Text / Link"),
            Tab(text: "Camera / Image"),
          ],
        ),
      ),
      body: _loading 
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFFC9A24D)),
              const SizedBox(height: 16),
              Text(_statusMessage, style: const TextStyle(color: Colors.grey))
            ],
          ))
        : TabBarView(
            controller: _tabController,
            children: [
              _buildTextTab(),
              _buildImageTab(),
            ],
          ),
    );
  }

  Widget _buildTextTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Enter details or paste a video link', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          TextField(
            controller: _textController,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'e.g. "Spicy pasta" or paste a YouTube link...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: const Color(0xFFF3F4F6),
            ),
          ),
          const SizedBox(height: 10),
          if (_userProfile != null && _userProfile!.dietaryPreferences.isNotEmpty)
            Row(children: [
              const Icon(LucideIcons.leaf, size: 14, color: Colors.green),
              const SizedBox(width: 8),
              Text('Using preferences: ${_userProfile!.dietaryPreferences.join(', ')}', style: const TextStyle(color: Colors.green, fontSize: 12))
            ]),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _generateFromText,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC9A24D),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(LucideIcons.wand2, color: Colors.white),
            label: const Text('Generate', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildImageTab() {
    if (_showOptions) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text("We found these dishes:", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          ..._recipeOptions.map((opt) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              tileColor: const Color(0xFFF3F4F6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              title: Text(opt, style: const TextStyle(fontWeight: FontWeight.bold)),
              trailing: const Icon(LucideIcons.chevronRight, color: Color(0xFFC9A24D)),
              onTap: () => _generateFromOption(opt),
            ),
          )),
          TextButton(
            onPressed: () => setState(() { _showOptions = false; _selectedImage = null; }),
            child: const Text("Retake Photo", style: TextStyle(color: Colors.grey)),
          )
        ],
      );
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (_selectedImage != null)
           Padding(
             padding: const EdgeInsets.all(20.0),
             child: ClipRRect(
               borderRadius: BorderRadius.circular(12),
               child: Image.memory(_selectedImage!, height: 200, fit: BoxFit.cover),
             ),
           ),
        OutlinedButton.icon(
          onPressed: _pickImage,
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: const Icon(LucideIcons.camera, color: Color(0xFFC9A24D), size: 32),
          label: const Text('Take / Upload Photo', style: TextStyle(color: Color(0xFF2E2E2E), fontSize: 16)),
        ),
      ],
    );
  }
}