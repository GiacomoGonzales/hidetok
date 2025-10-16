import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useScroll } from '../contexts/ScrollContext';

const CustomTabBar: React.FC<BottomTabBarProps> = (props) => {
  const { isScrollingDown } = useScroll();
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const prevScrollingDown = useRef(false);

  useEffect(() => {
    // Solo animar si el estado cambió
    if (prevScrollingDown.current !== isScrollingDown) {
      prevScrollingDown.current = isScrollingDown;

      Animated.timing(opacityAnim, {
        toValue: isScrollingDown ? 0.3 : 1, // 30% de opacidad al bajar, 100% al detenerse/subir
        duration: 300, // Animación suave de 300ms
        useNativeDriver: Platform.OS !== 'web', // useNativeDriver solo en native
      }).start();
    }
  }, [isScrollingDown, opacityAnim]);

  return (
    <Animated.View style={{ opacity: opacityAnim }}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
};

export default CustomTabBar;
