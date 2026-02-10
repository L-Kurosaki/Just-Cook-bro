import React from 'react';
import { View, Text } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import '../types';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const getDimensions = () => {
    switch(size) {
      case 'sm': return { container: 'w-10 h-10', icon: 20, text: 'text-lg', border: 2 };
      case 'lg': return { container: 'w-24 h-24', icon: 48, text: 'text-3xl', border: 4 };
      case 'xl': return { container: 'w-32 h-32', icon: 64, text: 'text-4xl', border: 4 };
      default: return { container: 'w-16 h-16', icon: 32, text: 'text-2xl', border: 2 }; // md
    }
  };

  const dims = getDimensions();

  return (
    <View className="items-center">
      <View className={`${dims.container} bg-gold/10 rounded-full items-center justify-center border-${dims.border} border-gold/20 mb-3`}>
        <ChefHat size={dims.icon} color="#C9A24D" />
      </View>
      {showText && (
        <View className="items-center">
            <Text className={`${dims.text} font-bold text-dark text-center`}>Just Cook Bro</Text>
            {size === 'xl' || size === 'lg' ? (
                 <Text className="text-midGrey font-medium text-sm text-center mt-1">Recipes, organized. Cooking, simplified.</Text>
            ) : null}
        </View>
      )}
    </View>
  );
};

export default Logo;