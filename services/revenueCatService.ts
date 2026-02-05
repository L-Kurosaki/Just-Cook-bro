import { SubscriptionPackage } from "../types";

// NOTE: Since this is a WEB application, we cannot use 'react-native-purchases'.
// This service mimics the exact structure of the RevenueCat SDK so your code logic remains valid.
// In a real React Native app, you would replace this simulation with actual SDK calls.

const ENTITLEMENT_ID = "Just Cook Bro Pro";
const API_KEY = "test_dwHcXCrwnKHRBVZddIqsHzYIEgh";

class RevenueCatService {
  private isPremium = false;

  async configure(apiKey: string) {
    console.log(`[RevenueCat] Configured with API Key: ${apiKey}`);
    // Check local storage to persist state in this web simulation
    const savedStatus = localStorage.getItem("jcb_premium_status");
    this.isPremium = savedStatus === "true";
  }

  async getOfferings(): Promise<SubscriptionPackage[]> {
    // These match the products you configured in RevenueCat
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
    localStorage.setItem("jcb_premium_status", "true");
    
    console.log("[RevenueCat] Purchase successful. Entitlement granted.");
    return true;
  }

  async restorePurchases(): Promise<boolean> {
    console.log("[RevenueCat] Restoring purchases...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const savedStatus = localStorage.getItem("jcb_premium_status");
    this.isPremium = savedStatus === "true";
    return this.isPremium;
  }
}

export const purchases = new RevenueCatService();
export const REVENUE_CAT_API_KEY = API_KEY;