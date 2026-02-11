import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/gemini_service.dart';
import '../services/storage_service.dart';
import '../services/revenue_cat_service.dart';
import 'cooking_mode_screen.dart';
import '../widgets/review_section.dart';
import '../widgets/paywall.dart';

class RecipeDetailScreen extends StatefulWidget {
  final Recipe recipe;

  const RecipeDetailScreen({super.key, required this.recipe});

  @override
  State<RecipeDetailScreen> createState() => _RecipeDetailScreenState();
}

class _RecipeDetailScreenState extends State<RecipeDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Recipe _recipe;
  final GeminiService _gemini = GeminiService();
  final StorageService _storage = StorageService();
  final RevenueCatService _rc = RevenueCatService();
  
  List<dynamic> _stores = [];
  bool _loadingStores = false;
  UserProfile? _userProfile;

  @override
  void initState() {
    super.initState();
    _recipe = widget.recipe;
    _tabController = TabController(length: 2, vsync: this);
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final p = await _storage.getProfile();
    setState(() => _userProfile = p);
  }

  Future<void> _findStores(String ingredient) async {
    setState(() => _loadingStores = true);
    final stores = await _gemini.findGroceryStores(ingredient, 37.77, -122.41);
    setState(() {
      _stores = stores;
      _loadingStores = false;
    });
  }

  Future<void> _deleteRecipe() async {
    bool canDelete = await _storage.deleteRecipe(_recipe.id);
    if (!mounted) return;
    
    if (canDelete) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Recipe deleted.')));
    } else {
      showModalBottomSheet(context: context, builder: (_) => const Paywall());
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Free limit reached. Upgrade to delete more.')));
    }
  }

  Future<void> _addToFolder() async {
    final isPremium = await _rc.isPremium();
    if (!isPremium) {
       if (mounted) showModalBottomSheet(context: context, builder: (_) => const Paywall());
       return;
    }

    final folders = await _storage.getFolders();
    if (!mounted) return;
    
    showModalBottomSheet(
      context: context,
      builder: (ctx) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
           const Text("Move to Folder", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
           const SizedBox(height: 10),
           ...folders.map((f) => ListTile(
             title: Text(f.name),
             leading: const Icon(LucideIcons.folder),
             onTap: () async {
               final updated = _recipe.copyWith(folderId: f.id);
               await _storage.saveRecipe(updated);
               setState(() => _recipe = updated);
               Navigator.pop(ctx);
             },
           ))
        ],
      )
    );
  }

  bool _hasSafetyWarning() {
    if (_userProfile == null) return false;
    // Simple check: if recipe allergens contains any of user allergies
    for (var allergy in _userProfile!.allergies) {
      if (_recipe.allergens.map((a) => a.toLowerCase()).contains(allergy.toLowerCase())) {
        return true;
      }
      // Also check ingredients title text
      for (var ing in _recipe.ingredients) {
        if (ing.name.toLowerCase().contains(allergy.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    bool unsafe = _hasSafetyWarning();

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: Colors.black,
            actions: [
               IconButton(icon: const Icon(LucideIcons.folderInput), onPressed: _addToFolder),
               IconButton(icon: const Icon(LucideIcons.trash2, color: Colors.red), onPressed: _deleteRecipe),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (_recipe.imageUrl != null)
                    Image.network(_recipe.imageUrl!, fit: BoxFit.cover),
                  Container(color: Colors.black.withOpacity(0.3)),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (unsafe)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red)),
                      child: Row(children: [
                        const Icon(LucideIcons.alertTriangle, color: Colors.red),
                        const SizedBox(width: 8),
                        Expanded(child: Text("Warning: This recipe may contain ingredients you are allergic to (${_userProfile?.allergies.join(', ')}).", style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)))
                      ]),
                    ),
                  
                  Text(_recipe.title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_recipe.tags.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Wrap(
                        spacing: 6, 
                        children: _recipe.tags.map((t) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(4)),
                          child: Text(t, style: const TextStyle(fontSize: 10, color: Color(0xFF6B6B6B))),
                        )).toList()
                      ),
                    ),

                  Text(_recipe.description, style: const TextStyle(color: Colors.grey, fontSize: 16)),
                  const SizedBox(height: 20),
                  
                  // Stats
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildInfoChip(LucideIcons.clock, _recipe.prepTime),
                      _buildInfoChip(LucideIcons.flame, _recipe.cookTime),
                      _buildInfoChip(LucideIcons.users, '${_recipe.servings} pp'),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Tabs
                  TabBar(
                    controller: _tabController,
                    labelColor: const Color(0xFFC9A24D),
                    unselectedLabelColor: Colors.grey,
                    indicatorColor: const Color(0xFFC9A24D),
                    tabs: const [Tab(text: 'Ingredients'), Tab(text: 'Steps')],
                  ),
                  const SizedBox(height: 20),

                  // Tab View Content (Inline for Sliver)
                  if (_tabController.index == 0) ...[
                    ..._recipe.ingredients.map((ing) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        width: 50, height: 50,
                        decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)),
                        child: ing.imageUrl != null 
                            ? Image.network(ing.imageUrl!, fit: BoxFit.cover, errorBuilder: (_,__,___) => const Icon(LucideIcons.carrot))
                            : const Icon(LucideIcons.carrot),
                      ),
                      title: Text(ing.name),
                      subtitle: Text(ing.amount),
                      trailing: IconButton(
                        icon: const Icon(LucideIcons.mapPin, color: Colors.grey),
                        onPressed: () => _findStores(ing.name),
                      ),
                    )),
                    if (_loadingStores) const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
                    if (_stores.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Text('Recommended Stores Nearby', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      const SizedBox(height: 8),
                      ..._stores.map((s) => ListTile(
                        leading: const CircleAvatar(backgroundColor: Color(0xFFC9A24D), child: Icon(LucideIcons.shoppingBag, color: Colors.white, size: 16)),
                        title: Text(s['name']),
                        subtitle: Text(s['address']),
                      )),
                    ]
                  ] else ...[
                     ..._recipe.steps.asMap().entries.map((entry) => ListTile(
                       leading: CircleAvatar(backgroundColor: const Color(0xFF2E2E2E), radius: 12, child: Text('${entry.key + 1}', style: const TextStyle(fontSize: 12, color: Color(0xFFC9A24D)))),
                       title: Text(entry.value.instruction),
                       subtitle: entry.value.tip != null ? Text('Tip: ${entry.value.tip}', style: const TextStyle(color: Colors.blue)) : null,
                     ))
                  ],

                  const SizedBox(height: 40),
                  ReviewSection(
                    reviews: const [], 
                    onAddReview: (rating, comment) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review added!')));
                    },
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (unsafe) {
            showDialog(
              context: context, 
              builder: (ctx) => AlertDialog(
                title: const Text("Safety Warning"),
                content: const Text("This recipe conflicts with your allergies. Are you sure you want to proceed?"),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => CookingModeScreen(recipe: _recipe)));
                    },
                    child: const Text("Proceed Anyway", style: TextStyle(color: Colors.white))
                  )
                ],
              )
            );
          } else {
             Navigator.push(context, MaterialPageRoute(builder: (_) => CookingModeScreen(recipe: _recipe)));
          }
        },
        backgroundColor: unsafe ? Colors.red : const Color(0xFFC9A24D),
        icon: const Icon(LucideIcons.chefHat, color: Colors.white),
        label: const Text('Start Cooking', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Row(children: [
      Icon(icon, size: 16, color: const Color(0xFFC9A24D)),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
    ]);
  }
}