import React, { useEffect, useState } from 'react';
import { purchases } from '../services/revenueCatService';
import { SubscriptionPackage } from '../types';
import { Check, Star, X } from 'lucide-react';

interface PaywallProps {
  onClose: () => void;
  onSuccess: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSuccess }) => {
  const [offerings, setOfferings] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const packages = await purchases.getOfferings();
      setOfferings(packages);
    };
    load();
  }, []);

  const handlePurchase = async (pkg: SubscriptionPackage) => {
    setLoading(true);
    try {
      const success = await purchases.purchasePackage(pkg);
      if (success) onSuccess();
    } catch (e) {
      alert("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:rounded-3xl rounded-t-3xl p-6 relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-midGrey hover:text-dark">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold">
            <Star className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-dark">Unlock Just Cook Bro <span className="text-gold">Pro</span></h2>
          <p className="text-midGrey text-sm mt-2">Become a master of your kitchen.</p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            "Unlimited Offline Recipes",
            "Advanced AI Cooking Assistant",
            "Premium Exclusive Recipes",
            "Ad-Free Experience"
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center text-white shrink-0">
                <Check size={12} strokeWidth={4} />
              </div>
              <span className="text-dark font-medium text-sm">{feat}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mt-auto">
          {offerings.map((pkg) => (
            <button
              key={pkg.identifier}
              onClick={() => handlePurchase(pkg)}
              disabled={loading}
              className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                pkg.identifier === 'yearly' 
                ? 'border-gold bg-gold/5' 
                : 'border-secondary hover:border-gold/50'
              }`}
            >
              <div className="text-left">
                <div className="font-bold text-dark">{pkg.title}</div>
                <div className="text-xs text-midGrey">{pkg.description}</div>
              </div>
              <div className="font-bold text-gold">{pkg.priceString}</div>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-center text-midGrey mt-6">
          Recurring billing. Cancel anytime via Profile settings.
        </p>
      </div>
    </div>
  );
};

export default Paywall;