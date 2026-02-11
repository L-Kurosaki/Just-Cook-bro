import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart'; // Ensure Review model is in models.dart

// Add Review model if missing in models.dart or use dynamic
class ReviewSection extends StatefulWidget {
  final List<dynamic> reviews; // Using dynamic to be safe, ideally List<Review>
  final Function(int rating, String comment) onAddReview;

  const ReviewSection({super.key, required this.reviews, required this.onAddReview});

  @override
  State<ReviewSection> createState() => _ReviewSectionState();
}

class _ReviewSectionState extends State<ReviewSection> {
  int _rating = 0;
  final _commentController = TextEditingController();

  void _submit() {
    if (_rating > 0 && _commentController.text.isNotEmpty) {
      widget.onAddReview(_rating, _commentController.text);
      setState(() {
        _rating = 0;
        _commentController.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Community Feedback', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        if (widget.reviews.isEmpty)
          const Text('No reviews yet. Be the first!', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
        
        ...widget.reviews.map((r) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(r['userName'] ?? 'Chef', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Row(children: List.generate(5, (i) => Icon(LucideIcons.star, size: 12, color: i < (r['rating'] ?? 0) ? const Color(0xFFC9A24D) : Colors.grey))),
                ],
              ),
              const SizedBox(height: 4),
              Text(r['comment'] ?? ''),
            ],
          ),
        )),

        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFF3F4F6)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Rate this recipe', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return IconButton(
                    icon: Icon(LucideIcons.star, color: index < _rating ? const Color(0xFFC9A24D) : Colors.grey[300]),
                    onPressed: () => setState(() => _rating = index + 1),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _commentController,
                decoration: InputDecoration(
                  hintText: 'Share your thoughts...',
                  filled: true,
                  fillColor: const Color(0xFFF3F4F6),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFC9A24D),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Post Review', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        ),
      ],
    );
  }
}
