import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/revenue_cat_service.dart';

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
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.orange.shade50, shape: BoxShape.circle),
            child: const Icon(LucideIcons.star, color: Color(0xFFC9A24D), size: 32),
          ),
          const SizedBox(height: 16),
          const Text('Unlock Pro Access', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const Text('Become a master of your kitchen.', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          
          if (_loading) const CircularProgressIndicator(color: Color(0xFFC9A24D))
          else Expanded(
            child: ListView.separated(
              itemCount: _packages.length,
              separatorBuilder: (_,__) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final pkg = _packages[index];
                return GestureDetector(
                  onTap: () async {
                    await _service.purchasePackage(pkg.identifier);
                    if (mounted) Navigator.pop(context);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: pkg.identifier == 'yearly' ? const Color(0xFFC9A24D) : const Color(0xFFF3F4F6),
                        width: 2
                      ),
                      borderRadius: BorderRadius.circular(16),
                      color: pkg.identifier == 'yearly' ? Colors.orange.shade50 : Colors.white
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
          
          const Text('Recurring billing. Cancel anytime.', style: TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}
