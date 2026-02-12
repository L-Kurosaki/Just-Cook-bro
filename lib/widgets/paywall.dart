import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../services/supabase_service.dart';

class Paywall extends StatefulWidget {
  const Paywall({super.key});

  @override
  State<Paywall> createState() => _PaywallState();
}

class _PaywallState extends State<Paywall> {
  bool _loading = true;
  Offerings? _offerings;
  bool _alreadyPremium = false;

  @override
  void initState() {
    super.initState();
    _fetchOfferings();
  }

  Future<void> _fetchOfferings() async {
    try {
      CustomerInfo info = await Purchases.getCustomerInfo();
      if (info.entitlements.all["pro"]?.isActive == true) {
        setState(() {
          _alreadyPremium = true;
          _loading = false;
        });
        // Sync just in case
        await SupabaseService().updateProfile(isPremium: true);
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
      CustomerInfo info = await Purchases.purchasePackage(package);
      if (mounted) {
        if (info.entitlements.all["pro"]?.isActive == true) {
           // Sync to Database
           await SupabaseService().updateProfile(isPremium: true);
           
           Navigator.pop(context);
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Welcome to Pro!")));
        }
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
      CustomerInfo info = await Purchases.restorePurchases();
      if (info.entitlements.all["pro"]?.isActive == true) {
        await SupabaseService().updateProfile(isPremium: true);
        if (mounted) Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Restored successfully.")));
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
               const Icon(Icons.check_circle, color: Colors.green, size: 60),
               const SizedBox(height: 20),
               const Text("You are already Premium!"),
               const SizedBox(height: 20),
               ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text("Go Back"))
             ],
           ),
         ),
       );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text("Premium Access"),
        actions: [
          TextButton(onPressed: _restore, child: const Text("Restore"))
        ],
      ),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : (_offerings?.current == null)
            ? const Center(child: Text("No offerings available. Check Google Play Console configuration."))
            : Column(
                children: [
                   const Padding(
                     padding: EdgeInsets.all(24.0),
                     child: Text(
                       "Unlock Unlimited Recipes, Folders, and Support Development!",
                       textAlign: TextAlign.center,
                       style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                     ),
                   ),
                   Expanded(
                     child: ListView.builder(
                       itemCount: _offerings!.current!.availablePackages.length,
                       padding: const EdgeInsets.all(16),
                       itemBuilder: (context, index) {
                         final package = _offerings!.current!.availablePackages[index];
                         return Card(
                           margin: const EdgeInsets.only(bottom: 12),
                           child: ListTile(
                             title: Text(package.storeProduct.title),
                             subtitle: Text(package.storeProduct.description),
                             trailing: Text(package.storeProduct.priceString, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                             onTap: () => _purchase(package),
                           ),
                         );
                       },
                     ),
                   ),
                   const Padding(
                     padding: EdgeInsets.all(16),
                     child: Text("100% Secure Payment via Google Play", style: TextStyle(color: Colors.grey, fontSize: 12)),
                   )
                ],
              ),
    );
  }
}