import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/supabase_service.dart';
import '../services/storage_service.dart';
import '../services/revenue_cat_service.dart';
import 'cooking_mode_screen.dart';
import 'recipe_detail_screen.dart';
import '../widgets/paywall.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  final SupabaseService _supabase = SupabaseService();
  final RevenueCatService _rc = RevenueCatService();
  bool _isPremium = false;

  @override
  void initState() {
    super.initState();
    _checkPremium();
  }

  Future<void> _checkPremium() async {
    bool p = await _rc.isPremium();
    if (mounted) setState(() => _isPremium = p);
  }

  Recipe _getRecipeFromPost(Map<String, dynamic> post) {
    Recipe original = Recipe.fromJson(post['content']);
    return original.copyWith(authorId: post['author_id']);
  }

  Future<void> _saveRecipe(Map<String, dynamic> post) async {
    try {
      final recipe = _getRecipeFromPost(post);
      
      // Save to Cloud (My Recipes)
      // This creates a private copy of the public recipe
      final myCopy = recipe.copyWith(isPublic: false);
      
      await _supabase.saveRecipe(myCopy);
      
      // NOTIFICATION LOGIC
      if (recipe.authorId != null) {
        await _supabase.notifyAuthor(recipe.authorId!, 'save', "saved your '${recipe.title}' recipe!");
      }
      
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Saved to your Cloud Cookbook!")));

    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _cookNow(Map<String, dynamic> post) async {
    final recipe = _getRecipeFromPost(post);

    if (recipe.authorId != null) {
       _supabase.notifyAuthor(recipe.authorId!, 'cook', "is cooking your '${recipe.title}' right now!");
    }

    if (mounted) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => CookingModeScreen(recipe: recipe)));
    }
  }

  void _showRatingModal(Map<String, dynamic> post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _RatingModal(
        post: post, 
        isPremium: _isPremium,
        onSubmit: (rating, comment) async {
          await _supabase.addCommentOrRating(post['id'].toString(), post['author_id'], rating, comment);
          if (mounted) Navigator.pop(context);
        }
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Community Feed', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_isPremium)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Icon(LucideIcons.zap, color: Colors.amber, size: 20),
            )
        ],
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: _supabase.getCommunityFeedStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)));
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text("No posts yet. Share your recipes!"));
          }

          final posts = snapshot.data!;

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: posts.length,
            itemBuilder: (context, index) {
              final post = posts[index];
              return _buildPostCard(post);
            },
          );
        },
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    final recipe = _getRecipeFromPost(post);
    final caption = post['caption'] as String?;
    final author = post['author_name'] as String? ?? 'Chef';
    final isAuthorPremium = post['author_is_premium'] == true; // Check if author is Gold
    final date = DateTime.tryParse(post['created_at']) ?? DateTime.now();

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))]
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: isAuthorPremium ? const Color(0xFFFFD700) : const Color(0xFFC9A24D),
                  radius: 18,
                  child: Text(author.isNotEmpty ? author[0].toUpperCase() : 'C', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          author, 
                          style: TextStyle(
                            fontWeight: FontWeight.bold, 
                            fontSize: 16,
                            color: isAuthorPremium ? const Color(0xFFDAA520) : Colors.black // Gold text for Premium authors
                          )
                        ),
                        if (isAuthorPremium)
                          const Padding(
                            padding: EdgeInsets.only(left: 4),
                            // Changed to standard Material Icon for reliability
                            child: Icon(Icons.verified, size: 14, color: Color(0xFFDAA520)),
                          )
                      ],
                    ),
                    Text("${date.hour}:${date.minute.toString().padLeft(2,'0')} • Today", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          
          // Image / Content
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipe: recipe))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (recipe.imageUrl != null)
                  Image.network(recipe.imageUrl!, height: 200, width: double.infinity, fit: BoxFit.cover),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(recipe.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      if (caption != null && caption.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(caption, style: const TextStyle(color: Color(0xFF4B4B4B))),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF3F4F6)))
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildActionBtn(LucideIcons.star, "Rate", () => _showRatingModal(post)),
                _buildActionBtn(LucideIcons.chefHat, "Cook", () => _cookNow(post), isPrimary: true),
                _buildActionBtn(LucideIcons.bookmark, "Save", () => _saveRecipe(post)),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label, VoidCallback onTap, {bool isPrimary = false}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Row(
          children: [
            Icon(
              icon, 
              size: 20, 
              color: isPrimary ? const Color(0xFFC9A24D) : Colors.black87
            ),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(
              fontWeight: FontWeight.w600, 
              color: isPrimary ? const Color(0xFFC9A24D) : Colors.black87
            )),
          ],
        ),
      ),
    );
  }
}

class _RatingModal extends StatefulWidget {
  final Map<String, dynamic> post;
  final bool isPremium;
  final Function(int, String?) onSubmit;

  const _RatingModal({required this.post, required this.isPremium, required this.onSubmit});

  @override
  State<_RatingModal> createState() => _RatingModalState();
}

class _RatingModalState extends State<_RatingModal> {
  int _rating = 0;
  final _commentController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20, 
        bottom: MediaQuery.of(context).viewInsets.bottom + 20
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Rate ${widget.post['author_name']}'s Recipe", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              return IconButton(
                icon: Icon(LucideIcons.star, size: 32, color: index < _rating ? const Color(0xFFC9A24D) : Colors.grey[300]),
                onPressed: () => setState(() => _rating = index + 1),
              );
            }),
          ),
          const SizedBox(height: 16),
          
          if (widget.isPremium)
            TextField(
              controller: _commentController,
              decoration: const InputDecoration(
                hintText: "Write a comment...",
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white
              ),
              maxLines: 2,
            )
          else
             Container(
               padding: const EdgeInsets.all(12),
               decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)),
               child: const Row(
                 children: [
                   Icon(LucideIcons.lock, size: 16, color: Colors.grey),
                   SizedBox(width: 8),
                   Expanded(child: Text("Only Premium users can leave written comments. You can still rate!", style: TextStyle(color: Colors.grey, fontSize: 12))),
                 ],
               ),
             ),

          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _rating > 0 
                ? () => widget.onSubmit(_rating, widget.isPremium ? _commentController.text : null)
                : null,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC9A24D)),
              child: const Text("Submit", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          )
        ],
      ),
    );
  }
}