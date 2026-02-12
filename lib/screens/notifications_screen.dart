import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models.dart';
import '../services/supabase_service.dart';
import '../services/revenue_cat_service.dart';
import '../widgets/paywall.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final SupabaseService _supabaseService = SupabaseService(); 
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

  // Revised approach: Connect to raw stream here to get 'trigger_user'
  Widget _buildRawList() {
    // We access Supabase.instance directly here, which requires the import above
    final userId = Supabase.instance.client.auth.currentUser?.id;
    
    if (userId == null) {
      return const Center(child: Text("Please log in to see notifications"));
    }

    return StreamBuilder<List<Map<String, dynamic>>>(
       stream: Supabase.instance.client
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .handleError((e) {
            // Handle table missing error gracefully in the stream
            return <Map<String, dynamic>>[];
        }),
       builder: (context, snapshot) {
         if (snapshot.hasError) {
             return const Center(child: Text("Notifications unavailable (DB not set up)", style: TextStyle(color: Colors.grey)));
         }

         if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)));
         }
         
         if (!snapshot.hasData || snapshot.data!.isEmpty) {
             return Center(
               child: Column(
                 mainAxisAlignment: MainAxisAlignment.center,
                 children: [
                   const Icon(LucideIcons.bellOff, size: 48, color: Colors.grey),
                   const SizedBox(height: 16),
                   const Text("No updates yet.", style: TextStyle(color: Colors.grey)),
                   if (!_isPremium) ...[
                     const SizedBox(height: 8),
                     const Text("Upgrade to see who likes your food!", style: TextStyle(fontSize: 12, color: Colors.amber)),
                   ]
                 ],
               )
             );
         }
         
         final data = snapshot.data!;
         return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: data.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx, i) => _buildRawTile(data[i]),
         );
       },
    );
  }

  Widget _buildRawTile(Map<String, dynamic> data) {
    String trigger = data['trigger_user'] ?? 'Someone';
    String suffix = data['message'] ?? '';
    String type = data['type'] ?? 'info';
    bool read = data['is_read'] ?? false;
    
    // CENSORSHIP
    if (!_isPremium) {
      trigger = "Someone";
    }

    final fullMessage = "$trigger $suffix";

    return GestureDetector(
      onTap: !_isPremium 
        ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const Paywall())) 
        : null, // Pro users can click to see details (future feature)
      child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: read ? Colors.white : (_isPremium ? Colors.white : Colors.grey.shade50), // Grey out for basic
              border: Border.all(color: const Color(0xFFF3F4F6)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  type == 'save' ? LucideIcons.bookmark : (type == 'cook' ? LucideIcons.chefHat : LucideIcons.star),
                  color: type == 'save' ? const Color(0xFFC9A24D) : Colors.black,
                  size: 20,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // BLURRED EFFECT FOR BASIC (Simulated by generic text)
                      !_isPremium 
                        ? Text(fullMessage, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))
                        : Text(fullMessage, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
                      
                      const SizedBox(height: 4),
                      if (!_isPremium)
                         const Text("Upgrade to see who.", style: TextStyle(fontSize: 10, color: Color(0xFFC9A24D), fontWeight: FontWeight.bold))
                    ],
                  ),
                ),
                if (!_isPremium) const Icon(LucideIcons.lock, size: 14, color: Colors.grey)
              ],
            ),
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Updates', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _buildRawList(),
    );
  }
}