import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class Logo extends StatelessWidget {
  final double size;
  final bool showText;

  const Logo({super.key, this.size = 100, this.showText = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Displays your custom logo from assets
        Image.asset(
          'assets/logo.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
          // Fallback if the file is missing or failed to load
          errorBuilder: (context, error, stackTrace) => Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: const Color(0xFFC9A24D).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(LucideIcons.chefHat, size: size * 0.5, color: const Color(0xFFC9A24D)),
          ),
        ),
        if (showText) ...[
          const SizedBox(height: 16),
          const Text(
            'Just Cook Bro',
            style: TextStyle(
              fontSize: 28, 
              fontWeight: FontWeight.bold, 
              color: Color(0xFF2E2E2E)
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Recipes, organized.',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
        ]
      ],
    );
  }
}
