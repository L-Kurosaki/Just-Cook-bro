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
  List<Map<String, dynamic>> _posts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await SupabaseService().getCommunityFeed();
    if (mounted) {
      setState(() {
        _posts = data;
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
        actions: [
          IconButton(icon: const Icon(LucideIcons.refreshCcw), onPressed: () {
            setState(() => _loading = true);
            _load();
          })
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)))
        : _posts.isEmpty 
          ? const Center(child: Text("No posts yet. Share your recipes!"))
          : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _posts.length,
            itemBuilder: (context, index) {
              final post = _posts[index];
              final recipe = Recipe.fromJson(post['content']);
              final caption = post['caption'] as String?;
              final author = post['author_name'] as String? ?? 'Chef';

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: const Color(0xFFC9A24D),
                        radius: 16,
                        child: Text(author[0].toUpperCase(), style: const TextStyle(color: Colors.white)),
                      ),
                      const SizedBox(width: 8),
                      Text(author, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (caption != null && caption.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Text(caption, style: const TextStyle(fontSize: 16)),
                    ),
                  RecipeCard(
                    recipe: recipe, 
                    onTap: () => Navigator.push(
                      context, 
                      MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipe: recipe))
                    )
                  ),
                  const Divider(height: 40),
                ],
              );
            },
          ),
    );
  }
}