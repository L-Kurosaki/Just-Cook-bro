import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Logo from './Logo';

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
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="items-center justify-center flex-1">
        <Logo size="xl" />
      </Animated.View>
    </Animated.View>
  );
};

export default SplashScreen;