import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { purchases } from '../services/revenueCatService';
import { SubscriptionPackage } from '../types';
import { Check, Star, X } from 'lucide-react-native';

interface PaywallProps {
  onClose: () => void;
  onSuccess: () => void;
  visible: boolean;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onSuccess, visible }) => {
  const [offerings, setOfferings] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const packages = await purchases.getOfferings();
      setOfferings(packages);
    };
    if (visible) load();
  }, [visible]);

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
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-white rounded-t-3xl p-6 h-[85%]">
          
          <TouchableOpacity onPress={onClose} className="absolute top-4 right-4 z-10 p-2">
            <X size={24} stroke="#6B6B6B" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="items-center mb-6 mt-4">
              <View className="w-16 h-16 bg-yellow-50 rounded-full items-center justify-center mb-4 border border-gold/20">
                <Star size={32} stroke="#C9A24D" fill="#C9A24D" />
              </View>
              <Text className="text-2xl font-bold text-dark text-center">Unlock Just Cook Bro <Text className="text-gold">Pro</Text></Text>
              <Text className="text-midGrey text-sm mt-2 text-center">Become a master of your kitchen.</Text>
            </View>

            <View className="gap-3 mb-8">
              {[
                "Unlimited Offline Recipes",
                "Advanced AI Cooking Assistant",
                "Premium Exclusive Recipes",
                "Ad-Free Experience"
              ].map((feat, i) => (
                <View key={i} className="flex-row items-center gap-3">
                  <View className="w-5 h-5 bg-gold rounded-full items-center justify-center">
                    <Check size={12} stroke="white" strokeWidth={4} />
                  </View>
                  <Text className="text-dark font-medium text-sm">{feat}</Text>
                </View>
              ))}
            </View>

            <View className="gap-3">
              {offerings.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => handlePurchase(pkg)}
                  disabled={loading}
                  className={`p-4 rounded-xl border-2 flex-row items-center justify-between ${
                    pkg.identifier === 'yearly' 
                    ? 'border-gold bg-yellow-50' 
                    : 'border-secondary'
                  }`}
                >
                  <View>
                    <Text className="font-bold text-dark text-base">{pkg.title}</Text>
                    <Text className="text-xs text-midGrey">{pkg.description}</Text>
                  </View>
                  <Text className="font-bold text-gold text-lg">{pkg.priceString}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && <ActivityIndicator className="mt-4" color="#C9A24D" />}

            <Text className="text-[10px] text-center text-midGrey mt-6 mb-10">
              Recurring billing. Cancel anytime via Profile settings.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default Paywall;