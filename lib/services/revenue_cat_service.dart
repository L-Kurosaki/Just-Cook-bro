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

// --- CRITICAL CONFIGURATION ---
// UPDATED: Matches the Identifier in your screenshot that has "3 products".
const String _entitlementId = 'Just Cook Bro Pro'; 

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
        print("🎧 Listener Triggered: Customer Info Updated");
        _handleCustomerInfoUpdate(customerInfo);
      });

      print("RevenueCat initialized successfully");
    } catch (e) {
      print("Failed to init RevenueCat: $e");
    }
  }

  // Logic to handle state changes (Expiration, Refund, Purchase)
  Future<void> _handleCustomerInfoUpdate(CustomerInfo customerInfo) async {
    // DEBUGGING: Print what we actually have vs what we expect
    final activeEntitlements = customerInfo.entitlements.active.keys.toList();
    print("🔍 CHECKING STATUS:");
    print("   - Active Entitlements found: $activeEntitlements");
    print("   - Looking for target ID: '$_entitlementId'");

    // 1. Strict Check
    bool isPro = customerInfo.entitlements.all[_entitlementId]?.isActive ?? false;
    
    // 2. Fallback Check (In case user switches back to 'pro' later or Dashboard is messy)
    if (!isPro) {
       // Check if the lowercase 'pro' is active
       if (customerInfo.entitlements.all['pro']?.isActive ?? false) {
         isPro = true;
         print("   - Found 'pro' entitlement active (Fallback).");
       }
    }

    print("   - Result: isPro = $isPro");

    // Update local UI state
    premiumNotifier.value = isPro;

    // SYNC WITH DATABASE
    // This handles revoking access if isPro becomes false (refund/expiry)
    try {
      await SupabaseService().updateProfile(isPremium: isPro);
      print("☁️ Database Sync: Premium status updated to $isPro");
    } catch (e) {
      print("❌ Sync Error: Could not update Supabase: $e");
    }
  }

  // Exposed for Manual Sync
  Future<void> syncPremiumStatus() async {
    if (!_isInitialized) return;
    try {
      // Force a fetch from the network to ensure we have the latest (ignoring cache if needed)
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
      
      // Check primary ID
      bool status = customerInfo.entitlements.all[_entitlementId]?.isActive ?? false;
      
      // Check fallback ID
      if (!status) {
        status = customerInfo.entitlements.all['pro']?.isActive ?? false;
      }

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
      // We try to show paywall for the ID that actually has products
      final paywallResult = await RevenueCatUI.presentPaywallIfNeeded(_entitlementId);
      
      // Force a sync check after the modal closes
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
      print("🔄 Restoring purchases...");
      await Purchases.restorePurchases();
      await syncPremiumStatus();
    } catch (e) {
      print("Restore failed: $e");
    }
  }
}
