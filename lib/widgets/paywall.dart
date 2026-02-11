import 'package:flutter/material.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

class Paywall extends StatelessWidget {
  const Paywall({super.key});

  @override
  Widget build(BuildContext context) {
    // This widget embeds the native Paywall View.
    // Ensure you have configured Offerings and Paywalls in the RevenueCat Dashboard.
    return Scaffold(
      body: PaywallView(
        onPurchaseCompleted: (customerInfo, storeTransaction) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Welcome to Just Cook Bro Pro!')),
          );
        },
        onRestoreCompleted: (customerInfo) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Purchases restored successfully.')),
          );
        },
        onDismiss: () {
          Navigator.pop(context);
        },
      ),
    );
  }
}
