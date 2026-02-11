class SubscriptionPackage {
  final String identifier;
  final String priceString;
  final String title;
  final String description;

  SubscriptionPackage({required this.identifier, required this.priceString, required this.title, required this.description});
}

class RevenueCatService {
  Future<List<SubscriptionPackage>> getOfferings() async {
    // Mock data mimicking RevenueCat
    await Future.delayed(const Duration(seconds: 1));
    return [
      SubscriptionPackage(identifier: 'monthly', priceString: '\$4.99', title: 'Monthly Chef', description: 'Billed monthly'),
      SubscriptionPackage(identifier: 'yearly', priceString: '\$39.99', title: 'Yearly Pro', description: 'Billed annually (Save 33%)'),
      SubscriptionPackage(identifier: 'lifetime', priceString: '\$99.99', title: 'Lifetime Access', description: 'Pay once, own forever'),
    ];
  }

  Future<bool> purchasePackage(String identifier) async {
    await Future.delayed(const Duration(seconds: 2));
    return true; // Simulate success
  }
}
