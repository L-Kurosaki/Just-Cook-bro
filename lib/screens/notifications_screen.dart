import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock notifications for UI demo
    final notifs = [
      AppNotification(id: '1', type: 'save', message: 'Gordon Ramsay saved your Spicy Chicken', date: DateTime.now()),
      AppNotification(id: '2', type: 'cook', message: 'Maria C. cooked your Risotto', date: DateTime.now().subtract(const Duration(days: 1))),
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: notifs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final n = notifs[index];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: n.read ? Colors.white : Colors.orange.shade50,
              border: Border.all(color: const Color(0xFFF3F4F6)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  n.type == 'save' ? LucideIcons.bookmark : LucideIcons.heart,
                  color: n.type == 'save' ? const Color(0xFFC9A24D) : Colors.red,
                  size: 20,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(n.message, style: const TextStyle(fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Text('${n.date.day}/${n.date.month}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }
}
