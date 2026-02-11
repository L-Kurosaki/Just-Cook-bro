import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

// Keys from environment
const String _googleKey = String.fromEnvironment('RC_GOOGLE_KEY');
const String _appleKey = String.fromEnvironment('RC_APPLE_KEY');

class SubscriptionPackage {
  final String identifier;
  final String priceString;
  final String title;
  final String description;
  final Package rcPackage; // The real RevenueCat package object

  SubscriptionPackage({
    required this.identifier, 
    required this.priceString, 
    required this.title, 
    required this.description,
    required this.rcPackage,
  });
}

class RevenueCatService {
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;

    String? apiKey;
    
    // Select key based on platform
    if (kIsWeb) {
      // Web support requires specific configuration usually involving Stripe
      // For this implementation, we will log a warning if on web
      print("RevenueCat Web configuration required.");
      return;
    } else {
      if (defaultTargetPlatform == TargetPlatform.android) {
        apiKey = _googleKey;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        apiKey = _appleKey;
      }
    }

    if (apiKey == null || apiKey.isEmpty) {
      print("⚠️ RevenueCat API Key missing for this platform.");
      return;
    }

    try {
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }
      
      PurchasesConfiguration configuration = PurchasesConfiguration(apiKey);
      await Purchases.configure(configuration);
      _isInitialized = true;
    } catch (e) {
      print("Failed to init RevenueCat: $e");
    }
  }

  Future<List<SubscriptionPackage>> getOfferings() async {
    if (!_isInitialized) {
      // Return mock data for testing if keys are missing
      return [
        // We can't return valid SubscriptionPackage without real RC objects in this mock fallback
        // So we return empty list to trigger empty state or loading
      ];
    }

    try {
      Offerings offerings = await Purchases.getOfferings();
      if (offerings.current != null && offerings.current!.availablePackages.isNotEmpty) {
        return offerings.current!.availablePackages.map((pkg) {
          return SubscriptionPackage(
            identifier: pkg.identifier,
            priceString: pkg.storeProduct.priceString,
            title: pkg.storeProduct.title,
            description: pkg.storeProduct.description,
            rcPackage: pkg,
          );
        }).toList();
      }
    } catch (e) {
      print("Error fetching offerings: $e");
    }
    return [];
  }

  Future<bool> purchasePackage(SubscriptionPackage package) async {
    if (!_isInitialized) return false;
    
    try {
      CustomerInfo customerInfo = await Purchases.purchasePackage(package.rcPackage);
      // Check for specific entitlement ID configured in RevenueCat dashboard (e.g. 'pro')
      return customerInfo.entitlements.all["pro"]?.isActive ?? false;
    } catch (e) {
      print("Purchase failed: $e");
      return false;
    }
  }

  Future<bool> isPremium() async {
    if (!_isInitialized) return false;
    try {
      CustomerInfo customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.all["pro"]?.isActive ?? false;
    } catch (e) {
      return false;
    }
  }
  
  Future<void> restorePurchases() async {
    if (!_isInitialized) return;
    try {
      await Purchases.restorePurchases();
    } catch (e) {
      print("Restore failed: $e");
    }
  }
}
