import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/supabase_service.dart';
import 'home_screen.dart'; // Reuse RecipeCard
import 'recipe_detail_screen.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  List<Recipe> _recipes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await SupabaseService().getPublicRecipes();
    if (mounted) {
      setState(() {
        _recipes = data;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Community Feed', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _recipes.length,
            itemBuilder: (context, index) {
              return RecipeCard(
                recipe: _recipes[index], 
                onTap: () => Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipe: _recipes[index]))
                )
              );
            },
          ),
    );
  }
}
