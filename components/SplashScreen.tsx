import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Image } from 'react-native';

// Require the image asset or use a URI if remote
declare const require: any;

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current; 
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate Logo
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

    // Start fade out sequence
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => clearTimeout(fadeTimer);
  }, [onFinish]);

  return (
    <Animated.View style={{ opacity: fadeAnim }} className="absolute inset-0 z-50 bg-white flex-1 items-center justify-center">
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="items-center">
        <View className="w-40 h-40 mb-6">
           <Image source={require('../assets/logo.png')} className="w-full h-full" resizeMode="contain" />
        </View>
        <Text className="text-2xl font-bold text-dark tracking-wider uppercase">Just Cook Bro</Text>
      </Animated.View>
    </Animated.View>
  );
};

export default SplashScreen;
