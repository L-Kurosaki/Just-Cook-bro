import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
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
  String? _avatarUrl;
  String _userName = "Chef";
  
  final RevenueCatService _rcService = RevenueCatService();
  final StorageService _storage = StorageService();
  final SupabaseService _supabase = SupabaseService();
  bool _isPro = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await _storage.getProfile();
    final proStatus = await _rcService.isPremium();
    final name = await _supabase.getUserName();
    final avatar = await _supabase.getUserAvatar();
    
    if (mounted) {
      setState(() {
        _profile = p;
        _isPro = proStatus;
        _userName = name;
        _avatarUrl = avatar;
        if (_profile != null) {
          _profile!.isPremium = proStatus;
          _profile!.name = name;
        }
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

  Future<void> _uploadImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      setState(() => _uploading = true);
      final bytes = await image.readAsBytes();
      try {
        await _supabase.uploadAvatar(bytes);
        await _load();
        if(mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Profile picture updated!")));
      } catch (e) {
        if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      } finally {
        if(mounted) setState(() => _uploading = false);
      }
    }
  }

  Future<void> _editName() async {
    TextEditingController controller = TextEditingController(text: _userName);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Edit Name"),
        content: TextField(controller: controller, decoration: const InputDecoration(labelText: "Full Name")),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isNotEmpty) {
                await _supabase.updateProfile(name: controller.text);
                await _load();
                if(mounted) Navigator.pop(ctx);
              }
            }, 
            child: const Text("Save")
          )
        ],
      )
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
            // Avatar with Upload
            GestureDetector(
              onTap: _uploadImage,
              child: Stack(
                alignment: Alignment.bottomRight,
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC9A24D),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      image: _avatarUrl != null 
                        ? DecorationImage(image: NetworkImage(_avatarUrl!), fit: BoxFit.cover) 
                        : null,
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
                    ),
                    alignment: Alignment.center,
                    child: _uploading 
                      ? const CircularProgressIndicator(color: Colors.white)
                      : (_avatarUrl == null 
                          ? Text(
                              _userName.isNotEmpty ? _userName[0].toUpperCase() : 'C',
                              style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white),
                            ) 
                          : null),
                  ),
                  Container(
                     padding: const EdgeInsets.all(6),
                     decoration: const BoxDecoration(color: Color(0xFF2E2E2E), shape: BoxShape.circle),
                     child: const Icon(LucideIcons.camera, color: Colors.white, size: 14),
                   )
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Name with Edit
            GestureDetector(
              onTap: _editName,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_userName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  const Icon(LucideIcons.edit2, size: 16, color: Colors.grey),
                ],
              ),
            ),
            
            Text(_profile!.email ?? '', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            
            // Pro Banner
            if (!_isPro)
              GestureDetector(
                onTap: () async {
                   await Navigator.push(context, MaterialPageRoute(builder: (_) => const Paywall()));
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
                            Text('Support development & unlock features.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                      Icon(LucideIcons.chevronRight, color: Colors.white),
                    ],
                  ),
                ),
              ),
            
            const SizedBox(height: 24),
            
            _buildSettingItem(
              LucideIcons.creditCard, 
              'Manage Subscription', 
              _isPro ? 'Active Premium' : 'Restore Purchases',
              () async {
                if (_isPro) {
                  _rcService.showCustomerCenter();
                } else {
                  await _rcService.restorePurchases();
                  _load();
                  if(mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Restoration checked.")));
                }
              },
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