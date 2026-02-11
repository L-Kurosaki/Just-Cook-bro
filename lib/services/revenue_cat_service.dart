import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

// User provided test key
const String _apiKey = 'test_BekbchnDGoHXuZwUveusGAGnaZc';
const String _entitlementId = 'pro'; // Mapping "Just Cook Bro Pro" to the ID 'pro'

class RevenueCatService {
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;

    // Web is not supported by purchases_flutter in the same way as mobile for this demo context
    if (kIsWeb) {
      print("RevenueCat Web configuration required.");
      return;
    }

    try {
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }

      PurchasesConfiguration configuration = PurchasesConfiguration(_apiKey);
      await Purchases.configure(configuration);
      _isInitialized = true;
      print("RevenueCat initialized with key: $_apiKey");
    } catch (e) {
      print("Failed to init RevenueCat: $e");
    }
  }

  /// Check if the user has the 'pro' entitlement (Just Cook Bro Pro)
  Future<bool> isPremium() async {
    if (!_isInitialized) return false;
    try {
      CustomerInfo customerInfo = await Purchases.getCustomerInfo();
      // Checking for 'pro' entitlement. Ensure this matches your RevenueCat dashboard.
      return customerInfo.entitlements.all[_entitlementId]?.isActive ?? false;
    } catch (e) {
      print("Error checking premium status: $e");
      return false;
    }
  }

  /// Display the RevenueCat Paywall natively
  /// Returns true if the user purchased or restored successfully
  Future<bool> showPaywall(BuildContext context) async {
    if (!_isInitialized) return false;

    try {
      // Present the Paywall. The handler returns only after dismissal.
      // We check status afterwards.
      final paywallResult = await RevenueCatUI.presentPaywallIfNeeded(_entitlementId);
      
      // If the paywall was presented and action taken, or if already pro:
      if (paywallResult == PaywallResult.purchased || paywallResult == PaywallResult.restored) {
        return true;
      }
      
      // Double check status manually
      return await isPremium();
    } catch (e) {
      print("Error showing paywall: $e");
      return false;
    }
  }

  /// Show the Customer Center for managing subscriptions
  Future<void> showCustomerCenter() async {
    if (!_isInitialized) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      print("Error showing customer center: $e");
    }
  }

  /// Manually restore purchases if needed (Customer Center handles this usually)
  Future<void> restorePurchases() async {
    if (!_isInitialized) return;
    try {
      await Purchases.restorePurchases();
    } catch (e) {
      print("Restore failed: $e");
    }
  }
}
