import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services/storage_service.dart';
import 'recipe_detail_screen.dart';
import 'add_recipe_screen.dart';
import '../widgets/logo.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Recipe> _recipes = [];
  bool _isLoading = true;
  final StorageService _storage = StorageService();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final recipes = await _storage.getRecipes();
    setState(() {
      _recipes = recipes;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hey Chef,', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold, fontSize: 24)),
            Text('Let\'s cook something.', style: TextStyle(color: Colors.grey, fontSize: 14)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(LucideIcons.bell, color: Color(0xFF2E2E2E)), onPressed: () {}),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)))
          : _recipes.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _recipes.length,
                    itemBuilder: (context, index) {
                      return RecipeCard(recipe: _recipes[index], onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipe: _recipes[index])),
                        );
                        _loadData(); // Reload on return
                      });
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFC9A24D),
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddRecipeScreen()));
          _loadData();
        },
        label: const Text('Add Recipe', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        icon: const Icon(LucideIcons.plus, color: Colors.white),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Using the app logo for consistency
          const Logo(size: 80, showText: false),
          const SizedBox(height: 16),
          const Text('No recipes yet.', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500)),
          TextButton(
            onPressed: () async {
               await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddRecipeScreen()));
               _loadData();
            },
            child: const Text('Add your first one', style: TextStyle(color: Color(0xFFC9A24D))),
          ),
        ],
      ),
    );
  }
}

class RecipeCard extends StatelessWidget {
  final Recipe recipe;
  final VoidCallback onTap;

  const RecipeCard({super.key, required this.recipe, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (recipe.imageUrl != null)
              Image.network(
                recipe.imageUrl!,
                height: 160,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  height: 160,
                  color: Colors.grey[300],
                  child: const Center(child: Icon(LucideIcons.image, color: Colors.grey)),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          recipe.title,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2E2E2E)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (recipe.isPremium)
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                           decoration: BoxDecoration(color: const Color(0xFF2E2E2E), borderRadius: BorderRadius.circular(4)),
                           child: const Text('PRO', style: TextStyle(color: Color(0xFFC9A24D), fontSize: 10, fontWeight: FontWeight.bold)),
                         ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(recipe.description, style: const TextStyle(color: Color(0xFF6B6B6B), fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(LucideIcons.clock, size: 14, color: Color(0xFF6B6B6B)),
                      const SizedBox(width: 4),
                      Text(recipe.prepTime, style: const TextStyle(color: Color(0xFF6B6B6B), fontSize: 12)),
                      const SizedBox(width: 16),
                      const Icon(LucideIcons.users, size: 14, color: Color(0xFF6B6B6B)),
                      const SizedBox(width: 4),
                      Text('${recipe.servings} pp', style: const TextStyle(color: Color(0xFF6B6B6B), fontSize: 12)),
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
