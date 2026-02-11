import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';
import '../services/revenue_cat_service.dart';
import 'auth_screen.dart';
import '../widgets/paywall.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfile? _profile;
  final RevenueCatService _rcService = RevenueCatService();
  bool _isPro = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await StorageService().getProfile();
    final proStatus = await _rcService.isPremium();
    
    if (mounted) {
      setState(() {
        _profile = p;
        _isPro = proStatus;
        // Update local profile model if needed
        if (_profile != null) _profile!.isPremium = proStatus;
      });
    }
  }

  Future<void> _logout() async {
    await SupabaseService().signOut();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AuthScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_profile == null) return const Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D)));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Profile', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut, color: Colors.red),
            onPressed: _logout,
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Avatar
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFC9A24D),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
              ),
              alignment: Alignment.center,
              child: Text(
                _profile!.name.isNotEmpty ? _profile!.name[0].toUpperCase() : 'C',
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
            const SizedBox(height: 16),
            Text(_profile!.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            
            // Status Badge
            if (_isPro)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF2E2E2E), borderRadius: BorderRadius.circular(12)),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.crown, size: 12, color: Color(0xFFC9A24D)),
                    SizedBox(width: 4),
                    Text('JUST COOK BRO PRO', style: TextStyle(color: Color(0xFFC9A24D), fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            const SizedBox(height: 32),
            
            // Upgrade / Manage Subscription Card
            if (!_isPro)
              GestureDetector(
                onTap: () async {
                   // Option 1: Use the embeddable Paywall widget via a modal
                   await showModalBottomSheet(
                     context: context, 
                     isScrollControlled: true,
                     useSafeArea: true,
                     builder: (_) => const Paywall()
                   );
                   _load(); // Reload status after closing
                },
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFC9A24D),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFFC9A24D).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: const Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Upgrade to Pro', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                            Text('Unlock unlimited offline recipes & AI tools.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.chevronRight, color: Colors.white),
                    ],
                  ),
                ),
              )
            else
              GestureDetector(
                onTap: () async {
                   await _rcService.showCustomerCenter();
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFC9A24D)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.settings, color: Color(0xFFC9A24D)),
                      SizedBox(width: 8),
                      Text('Manage Subscription', style: TextStyle(color: Color(0xFFC9A24D), fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            
            const SizedBox(height: 24),
            
            // Settings Cards
            _buildSettingItem(LucideIcons.music, 'Music History', 'View your cooking jams'),
            _buildSettingItem(LucideIcons.utensils, 'Dietary Preferences', 'Vegan, Keto, etc.'),
            _buildSettingItem(LucideIcons.alertTriangle, 'Allergies', 'Manage restrictions'),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 20, color: const Color(0xFF2E2E2E)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
        ],
      ),
    );
  }
}
