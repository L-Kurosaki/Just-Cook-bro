import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/gemini_service.dart';
import 'cooking_mode_screen.dart';
import '../widgets/review_section.dart';

class RecipeDetailScreen extends StatefulWidget {
  final Recipe recipe;

  const RecipeDetailScreen({super.key, required this.recipe});

  @override
  State<RecipeDetailScreen> createState() => _RecipeDetailScreenState();
}

class _RecipeDetailScreenState extends State<RecipeDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final GeminiService _gemini = GeminiService();
  List<dynamic> _stores = [];
  bool _loadingStores = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  Future<void> _findStores(String ingredient) async {
    setState(() => _loadingStores = true);
    final stores = await _gemini.findGroceryStores(ingredient, 37.77, -122.41);
    setState(() {
      _stores = stores;
      _loadingStores = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: Colors.black,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (widget.recipe.imageUrl != null)
                    Image.network(widget.recipe.imageUrl!, fit: BoxFit.cover),
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
                  Text(widget.recipe.title, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(widget.recipe.description, style: const TextStyle(color: Colors.grey, fontSize: 16)),
                  const SizedBox(height: 20),
                  
                  // Stats
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildInfoChip(LucideIcons.clock, widget.recipe.prepTime),
                      _buildInfoChip(LucideIcons.flame, widget.recipe.cookTime),
                      _buildInfoChip(LucideIcons.users, '${widget.recipe.servings} pp'),
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
                    ...widget.recipe.ingredients.map((ing) => ListTile(
                      leading: const Icon(LucideIcons.circle, size: 12, color: Color(0xFFC9A24D)),
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
                      const Text('Nearby Stores', style: TextStyle(fontWeight: FontWeight.bold)),
                      ..._stores.map((s) => ListTile(
                        leading: const Icon(LucideIcons.shoppingBag),
                        title: Text(s['name']),
                        subtitle: Text(s['address']),
                      )),
                    ]
                  ] else ...[
                     ...widget.recipe.steps.asMap().entries.map((entry) => ListTile(
                       leading: CircleAvatar(backgroundColor: const Color(0xFF2E2E2E), radius: 12, child: Text('${entry.key + 1}', style: const TextStyle(fontSize: 12, color: Color(0xFFC9A24D)))),
                       title: Text(entry.value.instruction),
                       subtitle: entry.value.tip != null ? Text('Tip: ${entry.value.tip}', style: const TextStyle(color: Colors.blue)) : null,
                     ))
                  ],

                  const SizedBox(height: 40),
                  ReviewSection(
                    reviews: const [], // Todo: fetch real reviews
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
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CookingModeScreen(recipe: widget.recipe))),
        backgroundColor: const Color(0xFFC9A24D),
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
