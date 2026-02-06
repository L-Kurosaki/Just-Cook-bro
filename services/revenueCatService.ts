import { SubscriptionPackage } from "../types";

// NOTE: This service simulates RevenueCat for demonstration purposes.
// In a production React Native app, replace this with 'react-native-purchases'.
//
// import Purchases from 'react-native-purchases';

const ENTITLEMENT_ID = "Just Cook Bro Pro";
// Use an environment variable for the key
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY || "simulated_key";

class RevenueCatService {
  private isPremium = false;

  async configure(apiKey: string) {
    console.log(`[RevenueCat] Configured`);
    // Simulating checking entitlement state
    this.isPremium = false; 
  }

  async getOfferings(): Promise<SubscriptionPackage[]> {
    // These match the products configured in RevenueCat/App Store/Play Store
    return [
      {
        identifier: "monthly",
        priceString: "$4.99",
        title: "Monthly Chef",
        description: "Billed monthly",
      },
      {
        identifier: "yearly",
        priceString: "$39.99",
        title: "Yearly Pro",
        description: "Billed annually (Save 33%)",
      },
      {
        identifier: "lifetime",
        priceString: "$99.99",
        title: "Lifetime Access",
        description: "Pay once, own forever",
      },
    ];
  }

  async getCustomerInfo() {
    console.log("[RevenueCat] Checking entitlements...");
    return {
      entitlements: {
        active: {
          [ENTITLEMENT_ID]: this.isPremium ? { 
            isActive: true,
            identifier: ENTITLEMENT_ID,
            latestPurchaseDate: new Date().toISOString()
          } : undefined,
        },
      },
    };
  }

  async purchasePackage(pkg: SubscriptionPackage): Promise<boolean> {
    console.log(`[RevenueCat] Purchasing package: ${pkg.identifier}`);
    
    // Simulate API network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Simulate successful purchase logic
    this.isPremium = true;
    
    console.log("[RevenueCat] Purchase successful. Entitlement granted.");
    return true;
  }

  async restorePurchases(): Promise<boolean> {
    console.log("[RevenueCat] Restoring purchases...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Simulate restore
    this.isPremium = true;
    return this.isPremium;
  }
}

export const purchases = new RevenueCatService();
export const REVENUE_CAT_API_KEY = API_KEY;