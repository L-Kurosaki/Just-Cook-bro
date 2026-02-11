import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

class Paywall extends StatefulWidget {
  const Paywall({super.key});

  @override
  State<Paywall> createState() => _PaywallState();
}

class _PaywallState extends State<Paywall> {
  bool _loading = true;
  Offerings? _offerings;

  @override
  void initState() {
    super.initState();
    _fetchOfferings();
  }

  Future<void> _fetchOfferings() async {
    try {
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
    setState(() => _loading = true);
    try {
      CustomerInfo info = await Purchases.purchasePackage(package);
      if (mounted) {
        if (info.entitlements.all["pro"]?.isActive == true) {
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
      await Purchases.restorePurchases();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      print("Restore failed: $e");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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