import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
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

  // --- CENSORSHIP LOGIC ---
  // If user is Premium: Show "Gordon Ramsay saved..."
  // If user is Basic: Show "Someone saved..."
  String _formatNotification(dynamic notifMap) {
    String triggerUser = notifMap['trigger_user'] ?? 'Someone';
    String messageSuffix = notifMap['message'] ?? '';
    
    // If Basic, replace the real name with generic
    if (!_isPremium) {
      triggerUser = "Someone";
    }

    return "$triggerUser $messageSuffix";
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
      body: StreamBuilder<List<AppNotification>>(
        stream: _supabase.getNotificationsStream(),
        builder: (context, snapshot) {
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

           final notifs = snapshot.data!;
           
           return ListView.separated(
             padding: const EdgeInsets.all(16),
             itemCount: notifs.length,
             separatorBuilder: (_, __) => const SizedBox(height: 12),
             itemBuilder: (context, index) {
               // We need the raw map or logic to reconstruct because AppNotification model usually stores the full message.
               // However, `notifyAuthor` in SupabaseService stores the suffix in `message`.
               // We need to re-fetch the `trigger_user` field which we added to the DB but maybe not the Model yet.
               // To keep it simple without changing Model structure too much, we assume `AppNotification` was not updated 
               // to hold `trigger_user` separately in `models.dart` (it wasn't in previous prompt). 
               //
               // ACTUALLY: `SupabaseService` inserts `trigger_user` into the DB column.
               // We should fetch raw JSON here to access `trigger_user` easily or update Model.
               // Since `getNotificationsStream` returns `AppNotification` objects, let's look at `models.dart`.
               // `AppNotification` currently has `message`. 
               //
               // WORKAROUND: In `SupabaseService`, `getNotificationsStream` maps JSON to `AppNotification`.
               // The JSON has `trigger_user` and `message` (suffix).
               // We need to pass the raw data or update the model. 
               // Let's assume the previous step didn't update the Model file yet. 
               // To fix this cleanly, I'll do the formatting *inside* the stream mapping in SupabaseService? 
               // No, censorship depends on *local state* (_isPremium).
               //
               // Let's use a StreamBuilder<List<Map>> locally to have full control.
               
               return _buildNotificationTile(notifs[index]);
             },
           );
        },
      ),
    );
  }
  
  // Revised approach: Connect to raw stream here to get 'trigger_user'
  Widget _buildRawList() {
    return StreamBuilder<List<Map<String, dynamic>>>(
       stream: Supabase.instance.client
        .from('notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', Supabase.instance.client.auth.currentUser!.id)
        .order('created_at', ascending: false),
       builder: (context, snapshot) {
         if (!snapshot.hasData || snapshot.data!.isEmpty) return const Center(child: Text("No notifications"));
         
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
              // Blur effect logic simulation
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
                      // BLURRED EFFECT FOR BASIC
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

  // To keep existing structure working, we swap the body to use _buildRawList
  // instead of the StreamBuilder<AppNotification> used in previous file versions.
  @override
  Widget build(BuildContext context) { // Override
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

  // Placeholder to satisfy the compiler if we kept old method
  Widget _buildNotificationTile(AppNotification n) { return Container(); }
}