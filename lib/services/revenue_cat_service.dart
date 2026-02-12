import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'supabase_service.dart';

// Helper for Env with fallback
String _getEnv(String key, String fallbackValue, {String? altKey}) {
  String value = String.fromEnvironment(key);
  if ((value.isEmpty || value.startsWith('\$')) && altKey != null) {
    value = String.fromEnvironment(altKey);
  }
  if (value.isEmpty || value.startsWith('\$')) {
    return fallbackValue;
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1);
  }
  return value;
}

final String _rawApiKey = _getEnv('RC_GOOGLE_KEY', 'test_BekbchnDGoHXuZwUveusGAGnaZc', altKey: 'ARC_google');
const String _entitlementId = 'pro'; 

class RevenueCatService {
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  bool _isInitialized = false;
  
  // GLOBAL STATE: Listen to this to change UI to GOLD
  final ValueNotifier<bool> premiumNotifier = ValueNotifier(false);

  Future<void> init() async {
    if (_isInitialized) return;

    String apiKey = _rawApiKey;

    if (apiKey.isEmpty) {
      print("⚠️ RevenueCat Error: RC_GOOGLE_KEY is missing.");
      return;
    }

    if (kIsWeb) {
      print("RevenueCat Web configuration required.");
      return;
    }

    try {
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }

      PurchasesConfiguration configuration = PurchasesConfiguration(apiKey);
      await Purchases.configure(configuration);
      _isInitialized = true;
      
      // 1. Check initial state
      await syncPremiumStatus();

      // 2. Listen for external updates (Renewals, Expirations, REFUNDS/REVOKES)
      Purchases.addCustomerInfoUpdateListener((customerInfo) {
        _handleCustomerInfoUpdate(customerInfo);
      });

      print("RevenueCat initialized successfully");
    } catch (e) {
      print("Failed to init RevenueCat: $e");
    }
  }

  // Logic to handle state changes (Expiration, Refund, Purchase)
  Future<void> _handleCustomerInfoUpdate(CustomerInfo customerInfo) async {
    final bool isPro = customerInfo.entitlements.all[_entitlementId]?.isActive ?? false;
    
    // Update local UI state
    premiumNotifier.value = isPro;

    // SYNC WITH DATABASE
    // This handles revoking access if isPro becomes false (refund/expiry)
    try {
      await SupabaseService().updateProfile(isPremium: isPro);
      print("Sync: Premium status updated to $isPro in Database.");
    } catch (e) {
      print("Sync Error: Could not update Supabase: $e");
    }
  }

  // Exposed for Manual Sync
  Future<void> syncPremiumStatus() async {
    if (!_isInitialized) return;
    try {
      CustomerInfo customerInfo = await Purchases.getCustomerInfo();
      await _handleCustomerInfoUpdate(customerInfo);
    } catch (e) {
      print("Error checking premium status: $e");
    }
  }

  Future<bool> isPremium() async {
    if (!_isInitialized) return false;
    try {
      CustomerInfo customerInfo = await Purchases.getCustomerInfo();
      bool status = customerInfo.entitlements.all[_entitlementId]?.isActive ?? false;
      premiumNotifier.value = status;
      return status;
    } catch (e) {
      return false;
    }
  }

  Future<bool> showPaywall(BuildContext context) async {
    if (!_isInitialized) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Billing not configured")));
      return false;
    }

    try {
      final paywallResult = await RevenueCatUI.presentPaywallIfNeeded(_entitlementId);
      
      // Wait a moment for the listener to fire, or manually check
      await syncPremiumStatus();

      if (paywallResult == PaywallResult.purchased || paywallResult == PaywallResult.restored) {
        return true;
      }
      return premiumNotifier.value;
    } catch (e) {
      print("Error showing paywall: $e");
      return false;
    }
  }

  Future<void> showCustomerCenter() async {
    if (!_isInitialized) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      print("Error showing customer center: $e");
    }
  }

  Future<void> restorePurchases() async {
    if (!_isInitialized) return;
    try {
      await Purchases.restorePurchases();
      await syncPremiumStatus();
    } catch (e) {
      print("Restore failed: $e");
    }
  }
}
