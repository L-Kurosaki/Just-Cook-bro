import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../services/revenue_cat_service.dart';

class Paywall extends StatefulWidget {
  const Paywall({super.key});

  @override
  State<Paywall> createState() => _PaywallState();
}

class _PaywallState extends State<Paywall> {
  bool _loading = true;
  Offerings? _offerings;
  bool _alreadyPremium = false;
  final RevenueCatService _rcService = RevenueCatService();

  @override
  void initState() {
    super.initState();
    _fetchOfferings();
  }

  Future<void> _fetchOfferings() async {
    try {
      // Check current status
      bool isPro = await _rcService.isPremium();
      if (isPro) {
        setState(() {
          _alreadyPremium = true;
          _loading = false;
        });
        return;
      }

      Offerings offerings = await Purchases.getOfferings();
      if (mounted) {
        setState(() {
          _offerings = offerings;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
      print("Error fetching offerings: $e");
    }
  }

  Future<void> _purchase(Package package) async {
    if (_alreadyPremium) return;
    
    setState(() => _loading = true);
    try {
      await Purchases.purchasePackage(package);
      
      // Force sync logic immediately
      bool isNowPro = await _rcService.isPremium();

      if (mounted && isNowPro) {
         Navigator.pop(context);
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
           content: Text("Welcome to Premium! Your experience is now Gold."),
           backgroundColor: Color(0xFFDAA520),
         ));
      }
    } catch (e) {
      print("Purchase failed: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _restore() async {
    setState(() => _loading = true);
    try {
      await _rcService.restorePurchases();
      bool isNowPro = await _rcService.isPremium();
      
      if (isNowPro) {
        if (mounted) Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Restored successfully.")));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("No active subscription found.")));
      }
    } catch (e) {
      print("Restore failed: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_alreadyPremium) {
       return Scaffold(
         body: Center(
           child: Column(
             mainAxisAlignment: MainAxisAlignment.center,
             children: [
               const Icon(Icons.verified, color: Color(0xFFFFD700), size: 80),
               const SizedBox(height: 20),
               const Text("You are already Premium!", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
               const Text("Enjoy your Gold status.", style: TextStyle(color: Colors.grey)),
               const SizedBox(height: 20),
               ElevatedButton(
                 onPressed: () => Navigator.pop(context), 
                 style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFFD700), foregroundColor: Colors.black),
                 child: const Text("Back to Kitchen")
               )
             ],
           ),
         ),
       );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text("Unlock Gold Tier"),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton(onPressed: _restore, child: const Text("Restore", style: TextStyle(color: Color(0xFFC9A24D))))
        ],
      ),
      body: _loading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFFFD700)))
        : (_offerings?.current == null)
            ? const Center(child: Text("No offerings available. Check Google Play Console."))
            : Column(
                children: [
                   Container(
                     padding: const EdgeInsets.all(24.0),
                     decoration: BoxDecoration(
                       gradient: LinearGradient(
                         colors: [Colors.white, const Color(0xFFFFD700).withOpacity(0.1)],
                         begin: Alignment.topCenter,
                         end: Alignment.bottomCenter
                       )
                     ),
                     child: const Column(
                       children: [
                         Icon(Icons.diamond, size: 50, color: Color(0xFFFFD700)),
                         SizedBox(height: 16),
                         Text(
                           "Unlock Unlimited Cooking",
                           textAlign: TextAlign.center,
                           style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                         ),
                         SizedBox(height: 8),
                         Text(
                           "Get Gold UI, Unlimited Recipes & Folders, and Support Development.",
                           textAlign: TextAlign.center,
                           style: TextStyle(color: Colors.grey),
                         ),
                       ],
                     ),
                   ),
                   Expanded(
                     child: ListView.builder(
                       itemCount: _offerings!.current!.availablePackages.length,
                       padding: const EdgeInsets.all(16),
                       itemBuilder: (context, index) {
                         final package = _offerings!.current!.availablePackages[index];
                         return Container(
                           margin: const EdgeInsets.only(bottom: 12),
                           decoration: BoxDecoration(
                             border: Border.all(color: const Color(0xFFFFD700)),
                             borderRadius: BorderRadius.circular(12),
                           ),
                           child: ListTile(
                             contentPadding: const EdgeInsets.all(16),
                             title: Text(package.storeProduct.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                             subtitle: Text(package.storeProduct.description),
                             trailing: Text(
                               package.storeProduct.priceString, 
                               style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFDAA520))
                             ),
                             onTap: () => _purchase(package),
                           ),
                         );
                       },
                     ),
                   ),
                   const Padding(
                     padding: EdgeInsets.all(16),
                     child: Text("Secure Payment via Google Play / App Store", style: TextStyle(color: Colors.grey, fontSize: 12)),
                   )
                ],
              ),
    );
  }
}
