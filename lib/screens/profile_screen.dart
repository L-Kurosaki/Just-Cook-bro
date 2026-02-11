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
  final StorageService _storage = StorageService();
  bool _isPro = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await _storage.getProfile();
    final proStatus = await _rcService.isPremium();
    
    if (mounted) {
      setState(() {
        _profile = p;
        _isPro = proStatus;
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

  Future<void> _openMultiSelectDialog(String title, List<String> currentList, Function(List<String>) onSave) async {
    // Standard lists, but could be dynamic
    final options = title.contains('Diet') 
      ? ['Vegan', 'Vegetarian', 'Keto', 'Paleo', 'Gluten-Free', 'Halal', 'Kosher']
      : ['Peanuts', 'Dairy', 'Shellfish', 'Soy', 'Eggs', 'Wheat', 'Fish'];

    await showDialog(
      context: context,
      builder: (ctx) {
        List<String> tempSelected = List.from(currentList);
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text("Select $title"),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: options.map((opt) {
                    final isSelected = tempSelected.contains(opt);
                    return CheckboxListTile(
                      title: Text(opt),
                      value: isSelected,
                      activeColor: const Color(0xFFC9A24D),
                      onChanged: (val) {
                        setState(() {
                          if (val == true) tempSelected.add(opt);
                          else tempSelected.remove(opt);
                        });
                      },
                    );
                  }).toList(),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                ElevatedButton(
                  onPressed: () {
                    onSave(tempSelected);
                    Navigator.pop(ctx);
                  }, 
                  child: const Text("Save")
                )
              ],
            );
          }
        );
      }
    );
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
            Stack(
              alignment: Alignment.bottomRight,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC9A24D),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _profile!.name.isNotEmpty ? _profile!.name[0].toUpperCase() : 'C',
                    style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                if (_isPro)
                   Container(
                     padding: const EdgeInsets.all(4),
                     decoration: const BoxDecoration(color: Color(0xFF2E2E2E), shape: BoxShape.circle),
                     child: const Icon(LucideIcons.crown, color: Color(0xFFC9A24D), size: 16),
                   )
              ],
            ),
            const SizedBox(height: 16),
            Text(_profile!.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text(_profile!.email ?? '', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            
            // Pro Banner
            if (!_isPro)
              GestureDetector(
                onTap: () async {
                   await showModalBottomSheet(
                     context: context, 
                     isScrollControlled: true,
                     useSafeArea: true,
                     builder: (_) => const Paywall()
                   );
                   _load(); 
                },
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFC9A24D), Color(0xFFE0B75E)]),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFFC9A24D).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: const Row(
                    children: [
                      Icon(LucideIcons.zap, color: Colors.white),
                      SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Upgrade to Pro', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                            Text('Unlimited recipes, folders & more.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.chevronRight, color: Colors.white),
                    ],
                  ),
                ),
              ),
            
            const SizedBox(height: 24),
            
            // Settings List
            _buildSettingItem(
              LucideIcons.music, 
              'Music History', 
              'View your cooking jams',
              () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Music History coming soon!")));
              } 
            ),
            _buildSettingItem(
              LucideIcons.utensils, 
              'Dietary Preferences', 
              _profile!.dietaryPreferences.isEmpty ? 'None set' : _profile!.dietaryPreferences.join(', '),
              () => _openMultiSelectDialog('Dietary Preferences', _profile!.dietaryPreferences, (newList) async {
                setState(() => _profile!.dietaryPreferences = newList);
                await _storage.saveProfile(_profile!);
              })
            ),
            _buildSettingItem(
              LucideIcons.alertTriangle, 
              'Allergies', 
              _profile!.allergies.isEmpty ? 'None set' : _profile!.allergies.join(', '),
              () => _openMultiSelectDialog('Allergies', _profile!.allergies, (newList) async {
                setState(() => _profile!.allergies = newList);
                await _storage.saveProfile(_profile!);
              })
            ),
            _buildSettingItem(
              LucideIcons.creditCard, 
              'Manage Subscription', 
              _isPro ? 'Active' : 'Free Plan',
              () => _rcService.showCustomerCenter(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}