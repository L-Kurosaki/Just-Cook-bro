import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/storage_service.dart';
import '../services/revenue_cat_service.dart';
import '../services/supabase_service.dart';
import 'recipe_detail_screen.dart';
import 'add_recipe_screen.dart';
import 'folder_manager_screen.dart';
import '../widgets/logo.dart';
import '../widgets/paywall.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Recipe> _allRecipes = [];
  List<Recipe> _filteredRecipes = [];
  List<Folder> _folders = [];
  String? _selectedFolderId;
  String? _activeFilterTag;
  String _userName = "Chef";
  
  bool _isLoading = true;
  final StorageService _storage = StorageService();
  final RevenueCatService _rcService = RevenueCatService();
  final SupabaseService _supabase = SupabaseService();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    // Load local recipes
    final recipes = await _storage.getRecipes();
    final folders = await _storage.getFolders();
    
    // Load Real User Name
    final name = await _supabase.getUserName();

    setState(() {
      _allRecipes = recipes;
      _folders = folders;
      _userName = name;
      _filterRecipes();
      _isLoading = false;
    });
  }

  void _filterRecipes() {
    List<Recipe> temp = _allRecipes;
    
    // Filter by Folder (Include checking subfolders if we implemented logic for it, but for now strict ID)
    if (_selectedFolderId != null) {
      temp = temp.where((r) => r.folderId == _selectedFolderId).toList();
    }

    // Filter by Tag
    if (_activeFilterTag != null) {
         temp = temp.where((r) => r.tags.contains(_activeFilterTag) || r.title.contains(_activeFilterTag!)).toList();
    }

    setState(() {
      _filteredRecipes = temp;
    });
  }

  Future<void> _openFolderManager() async {
    final isPremium = await _rcService.isPremium();
    
    if (!isPremium) {
       if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => const Paywall()));
       return;
    }

    // Open Premium Folder Manager
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const FolderManagerScreen()));
    _loadData(); // Reload when coming back
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Filter Recipes", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildFilterChip("All", null),
                  _buildFilterChip("Vegan", "Vegan"),
                  _buildFilterChip("Vegetarian", "Vegetarian"),
                  _buildFilterChip("Keto", "Keto"),
                  _buildFilterChip("Gluten-Free", "Gluten-Free"),
                  _buildFilterChip("Spicy", "Spicy"),
                  _buildFilterChip("Dessert", "Dessert"),
                ],
              )
            ],
          ),
        );
      }
    );
  }

  Widget _buildFilterChip(String label, String? val) {
    return ChoiceChip(
      label: Text(label),
      selected: _activeFilterTag == val,
      onSelected: (selected) {
        setState(() => _activeFilterTag = selected ? val : null);
        _filterRecipes();
        Navigator.pop(context);
      },
      selectedColor: const Color(0xFFC9A24D),
      labelStyle: TextStyle(color: _activeFilterTag == val ? Colors.white : Colors.black),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dynamic Name
            Text('Hi $_userName,', style: const TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold, fontSize: 22)),
            const Text('Let\'s cook something real.', style: TextStyle(color: Colors.grey, fontSize: 14)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(LucideIcons.filter, color: Color(0xFF2E2E2E)), onPressed: _showFilterSheet),
          IconButton(icon: const Icon(LucideIcons.crown, color: Color(0xFFC9A24D)), onPressed: () {
             Navigator.push(context, MaterialPageRoute(builder: (_) => const Paywall()));
          }),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)))
          : Column(
              children: [
                _buildFolderBar(),
                Expanded(
                  child: _filteredRecipes.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredRecipes.length,
                          itemBuilder: (context, index) {
                            return RecipeCard(recipe: _filteredRecipes[index], onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipe: _filteredRecipes[index])),
                              );
                              _loadData(); 
                            });
                          },
                        ),
                      ),
                ),
              ],
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

  Widget _buildFolderBar() {
    // Logic: Show Root folders only (parentId == null).
    // Limit to 2 folders max + "More" button to avoid long queue.
    final rootFolders = _folders.where((f) => f.parentId == null).toList();
    final displayFolders = rootFolders.take(2).toList();
    final hasMore = rootFolders.length > 2;

    return Container(
      height: 50,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _buildFolderChip(null, "All Recipes"),
          ...displayFolders.map((f) => _buildFolderChip(f.id, f.name)),
          
          // "More / Manage" Button
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: ActionChip(
              label: Text(hasMore ? "+ ${rootFolders.length - 2} More" : "Folders"),
              avatar: const Icon(LucideIcons.folderCog, size: 16, color: Colors.black),
              onPressed: _openFolderManager,
              backgroundColor: Colors.white,
              side: const BorderSide(color: Colors.grey),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildFolderChip(String? id, String label) {
    final isSelected = _selectedFolderId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: const Color(0xFFC9A24D),
        labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black),
        backgroundColor: Colors.white,
        side: isSelected ? BorderSide.none : const BorderSide(color: Colors.grey),
        onSelected: (val) {
          setState(() {
            _selectedFolderId = id;
            _filterRecipes();
          });
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Logo(size: 80, showText: false),
            const SizedBox(height: 24),
            Text(
              _activeFilterTag != null 
                  ? 'No recipes found for "$_activeFilterTag".' 
                  : 'Your kitchen is quiet.', 
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2E2E2E))
            ),
            const SizedBox(height: 8),
            const Text(
              "Start by adding a recipe via the button below.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            // REMOVED: Redundant 'Add Recipe' button here. 
            // The FloatingActionButton is sufficient and consistent.
          ],
        ),
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
                           margin: const EdgeInsets.only(left: 8),
                           padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                           decoration: BoxDecoration(color: const Color(0xFF2E2E2E), borderRadius: BorderRadius.circular(4)),
                           child: const Text('PRO', style: TextStyle(color: Color(0xFFC9A24D), fontSize: 10, fontWeight: FontWeight.bold)),
                         ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  
                  // Author Info if available
                  if (recipe.author != null)
                     Padding(
                       padding: const EdgeInsets.only(bottom: 6.0),
                       child: Text("by ${recipe.author}", style: const TextStyle(fontSize: 12, color: Color(0xFFC9A24D), fontStyle: FontStyle.italic)),
                     ),

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