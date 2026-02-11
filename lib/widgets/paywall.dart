import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/revenue_cat_service.dart';
import 'logo.dart';

class Paywall extends StatefulWidget {
  const Paywall({super.key});

  @override
  State<Paywall> createState() => _PaywallState();
}

class _PaywallState extends State<Paywall> {
  final RevenueCatService _service = RevenueCatService();
  List<SubscriptionPackage> _packages = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final pkgs = await _service.getOfferings();
    if (mounted) {
      setState(() {
        _packages = pkgs;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              icon: const Icon(LucideIcons.x, color: Colors.grey),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          const SizedBox(height: 10),
          // Using Logo instead of generic icon for consistency
          const Logo(size: 80, showText: false),
          const SizedBox(height: 16),
          const Text('Unlock Pro Access', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const Text('Become a master of your kitchen.', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          
          if (_loading) 
             const Expanded(child: Center(child: CircularProgressIndicator(color: Color(0xFFC9A24D))))
          else if (_packages.isEmpty)
             const Expanded(child: Center(child: Text("No offers available right now.", style: TextStyle(color: Colors.grey))))
          else Expanded(
            child: ListView.separated(
              itemCount: _packages.length,
              separatorBuilder: (_,__) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final pkg = _packages[index];
                final isHighlight = pkg.identifier.contains('year') || pkg.identifier.contains('annual');
                
                return GestureDetector(
                  onTap: () async {
                    final success = await _service.purchasePackage(pkg);
                    if (success && mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Welcome to Pro!')));
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: isHighlight ? const Color(0xFFC9A24D) : const Color(0xFFF3F4F6),
                        width: 2
                      ),
                      borderRadius: BorderRadius.circular(16),
                      color: isHighlight ? Colors.orange.shade50 : Colors.white
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(pkg.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(pkg.description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                        Text(pkg.priceString, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFC9A24D))),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          const SizedBox(height: 16),
          TextButton(
            onPressed: () async {
                await _service.restorePurchases();
                if (mounted) Navigator.pop(context);
            },
            child: const Text('Restore Purchases', style: TextStyle(color: Colors.grey, decoration: TextDecoration.underline)),
          ),
          const Text('Recurring billing. Cancel anytime.', style: TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}
