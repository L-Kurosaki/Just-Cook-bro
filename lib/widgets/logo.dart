import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class Logo extends StatelessWidget {
  final double size;
  final bool showText;

  const Logo({super.key, this.size = 64, this.showText = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: const Color(0xFFC9A24D).withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFC9A24D).withOpacity(0.2), width: size * 0.05),
          ),
          child: Icon(LucideIcons.chefHat, size: size * 0.5, color: const Color(0xFFC9A24D)),
        ),
        if (showText) ...[
          const SizedBox(height: 12),
          const Text(
            'Just Cook Bro',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF2E2E2E)),
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
